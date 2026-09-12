"""Bulk loader: COPY processed canonical data into PostgreSQL safely.

Design:

1. Materialise the processed JSONL into CSV files (streaming, bounded memory).
2. Compute a fingerprint over the reconcile outputs.
3. If the same fingerprint was already imported successfully, skip (idempotent).
4. Create the schema and staging tables, COPY the CSVs in.
5. In a single transaction: register an import run, merge staging → production
   (all merges are ON CONFLICT DO NOTHING on natural keys), commit.
6. On failure the transaction rolls back — production tables are never left
   half-imported.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from ..logging import LOG
from ..pipeline.io import iter_jsonl
from .postgres import connect
from .schema import (
    INDEXES_SQL,
    MERGE_CONFLICTS_SQL,
    MERGE_PROVENANCE_SQL,
    MERGE_QUALITY_SQL,
    MERGES_SQL,
    SOURCES_SEED_SQL,
    STAGING_TABLES_SQL,
    VOCABULARY_SCHEMA_SQL,
)


class BulkLoadError(RuntimeError):
    pass


def _csv_open(path: Path):
    import csv

    fh = path.open("w", encoding="utf-8", newline="")
    writer = csv.writer(fh, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
    return fh, writer


class CsvBuilder:
    """Builds all COPY-ready CSV files from the processed JSONL streams."""

    def __init__(self, out_dir: Path, processed_dir: Path) -> None:
        self.out_dir = out_dir
        self.processed_dir = processed_dir
        self.paths = {name: out_dir / f"{name}.csv" for name in _STAGE_COLUMNS}

    def build_all(self) -> dict:
        builders = {
            "stage_entries": self._entries,
            "stage_senses": self._senses,
            "stage_translations": self._translations,
            "stage_examples": self._examples,
            "stage_cefr": self._cefr,
            "stage_frequency": self._frequency,
            "stage_synsets": self._synsets,
            "stage_sense_synsets": self._sense_synsets,
            "stage_rels": self._rels,
            "stage_conflicts": self._conflicts,
            "stage_provenance": self._provenance,
            "stage_quality": self._quality,
        }
        counts: dict[str, int] = {}
        for name, fn in builders.items():
            counts[name] = 0
            with self._writer(name) as writer:
                for row in fn():
                    writer.writerow(row)
                    counts[name] += 1
        return counts

    def _writer(self, name: str):
        fh, writer = _csv_open(self.paths[name])
        return _CsvContext(fh, writer)

    # ---- producers ----------------------------------------------------------
    def _entries(self):
        for r in iter_jsonl(self._src("canonical_entries.jsonl")):
            yield [
                r.get("lemma"), r.get("normalized_lemma"), r.get("part_of_speech"),
                r.get("language", "en"), r.get("display_form") or r.get("lemma"),
                r.get("wikidata_qid") or "",
            ]

    def _senses(self):
        for r in iter_jsonl(self._src("canonical_senses.jsonl")):
            yield [
                r.get("normalized_lemma"), r.get("part_of_speech"), r.get("position"),
                r.get("lemma"), r.get("definition"), r.get("normalized_definition"),
                r.get("raw_definition") or "",
                "|".join(r.get("tags") or []),
                r.get("sense_id_hint") or "", r.get("wikidata_qid") or "",
                r.get("source_record_id") or "",
            ]

    def _translations(self):
        for r in iter_jsonl(self._src("canonical_translations.jsonl")):
            yield [
                _nlemma_from_entry_key(r.get("entry_key", "")),
                _pos_from_entry_key(r.get("entry_key", "")),
                r.get("sense_position"), "pl", r.get("text"), r.get("normalized_text"),
                r.get("sense_label") or "", r.get("match_method") or "",
                r.get("confidence") or "",
            ]

    def _examples(self):
        for r in iter_jsonl(self._src("canonical_examples.jsonl")):
            yield [
                _nlemma_from_entry_key(r.get("entry_key", "")),
                _pos_from_entry_key(r.get("entry_key", "")),
                r.get("sense_position"), r.get("text"), r.get("example_type") or "example",
                r.get("ref") or "",
            ]

    def _cefr(self):
        for r in iter_jsonl(self._src("cefr_assignments.jsonl")):
            yield [
                r.get("normalized_lemma"), _pos_from_entry_key(r.get("entry_key", "")),
                r.get("sense_position"), r.get("level"), r.get("source"),
                r.get("source_version") or "", r.get("match_method") or "lemma+pos",
                r.get("confidence") or "MEDIUM", bool(r.get("requires_review", False)),
            ]

    def _frequency(self):
        for r in iter_jsonl(self._src("frequency_data.jsonl")):
            yield [
                _nlemma_from_entry_key(r.get("entry_key", "")),
                r.get("rank"), r.get("sfi"), r.get("frequency_per_million"),
            ]

    def _synsets(self):
        for r in iter_jsonl(self._src("canonical_wordnet_synsets.jsonl")):
            yield [
                r.get("synset_id"), r.get("pos"), r.get("definition"),
                "|".join(r.get("members") or []), r.get("ili") or "", r.get("wikidata") or "",
            ]

    def _sense_synsets(self):
        for r in iter_jsonl(self._src("sense_synsets.jsonl")):
            yield [
                _nlemma_from_entry_key(r.get("entry_key", "")),
                _pos_from_entry_key(r.get("entry_key", "")),
                r.get("sense_position"), r.get("synset_id"), r.get("match_method") or "gloss_similarity",
                r.get("confidence") or "LOW", r.get("score") or "",
            ]

    def _rels(self):
        for r in iter_jsonl(self._src("semantic_relationships.jsonl")):
            yield [r.get("source_synset_id"), r.get("relationship_type"), r.get("target_synset_id")]

    def _conflicts(self):
        for r in iter_jsonl(self._src("conflicts.jsonl")):
            yield [
                r.get("field_name"), r.get("entity_key"),
                "|".join(r.get("sources") or []), "|".join(r.get("values") or []),
                r.get("resolution") or "", bool(r.get("requires_review", True)),
            ]

    def _provenance(self):
        for r in iter_jsonl(self._src("provenance_records.jsonl")):
            yield [
                r.get("entity_type"), r.get("entity_key"), r.get("field_name"),
                r.get("source"), r.get("source_version") or "", r.get("source_record_id") or "",
                r.get("match_method") or "", r.get("confidence") or "",
            ]

    def _quality(self):
        for r in iter_jsonl(self._src("quality_issues.jsonl")):
            yield [
                r.get("entity_type"), r.get("entity_key") or "", r.get("issue_code"),
                r.get("severity"), r.get("message") or "",
            ]

    def _src(self, name: str) -> Path:
        return self.processed_dir / name


class _CsvContext:
    def __init__(self, fh, writer) -> None:
        self.fh = fh
        self.writer = writer

    def __enter__(self):
        return self.writer

    def __exit__(self, *exc):
        self.fh.close()


_STAGE_COLUMNS = {
    "stage_entries": None,
    "stage_senses": None,
    "stage_translations": None,
    "stage_examples": None,
    "stage_cefr": None,
    "stage_frequency": None,
    "stage_synsets": None,
    "stage_sense_synsets": None,
    "stage_rels": None,
    "stage_conflicts": None,
    "stage_provenance": None,
    "stage_quality": None,
}


def _nlemma_from_entry_key(key: str) -> str:
    return key.split("|", 1)[0] if key else ""


def _pos_from_entry_key(key: str) -> str:
    return key.split("|", 1)[1] if key and "|" in key else ""


def fingerprint(processed_dir: Path) -> str:
    """Hash the reconcile outputs that feed the load stage."""
    hasher = hashlib.sha256()
    files = [
        "canonical_entries.jsonl",
        "canonical_senses.jsonl",
        "canonical_translations.jsonl",
        "canonical_examples.jsonl",
        "cefr_assignments.jsonl",
        "frequency_data.jsonl",
        "canonical_wordnet_synsets.jsonl",
        "sense_synsets.jsonl",
        "semantic_relationships.jsonl",
        "conflicts.jsonl",
        "rejected_translations.jsonl",
    ]
    for name in files:
        path = processed_dir / name
        if not path.exists():
            continue
        hasher.update(name.encode())
        size = path.stat().st_size
        hasher.update(str(size).encode())
        with path.open("rb") as fh:
            hasher.update(fh.read(max(0, min(size, 1 << 20))))
            if size > (1 << 22):
                fh.seek(size - (1 << 20))
                hasher.update(fh.read(1 << 20))
    return hasher.hexdigest()


class BulkLoader:
    def __init__(self, cfg, database_url: str | None = None) -> None:
        self.cfg = cfg
        self.database_url = database_url or cfg.database_url
        self.bulk_dir = cfg.staging_dir / "bulk"
        self.bulk_dir.mkdir(parents=True, exist_ok=True)

    def load(self, dry_run: bool = False, skip_fingerprint: bool = False) -> dict:
        if not self.database_url:
            raise BulkLoadError("DATABASE_URL is not configured.")

        builder = CsvBuilder(self.bulk_dir, self.cfg.processed_dir)
        counts = builder.build_all()
        LOG.info("bulk CSVs built: %s", counts)

        fp = fingerprint(self.cfg.processed_dir)
        LOG.info("load fingerprint=%s", fp[:16])

        with connect(self.database_url) as conn:
            conn.execute(VOCABULARY_SCHEMA_SQL)
            conn.execute(INDEXES_SQL)
            conn.execute(SOURCES_SEED_SQL)
            conn.commit()

            source_id = _source_id_for(conn, "pipeline_main")
            LOG.info("run source_id=%s dry_run=%s", source_id, dry_run)

            if not skip_fingerprint:
                existing = conn.execute(
                    "SELECT id, status FROM vocabulary_import_runs "
                    "WHERE source_id = %s AND fingerprint = %s ORDER BY id DESC LIMIT 1",
                    (source_id, fp),
                ).fetchone()
                if existing and existing["status"] == "success":
                    LOG.info("import already completed (run %s) — skipping", existing["id"])
                    return {"skipped": True, "run_id": existing["id"], "fingerprint": fp[:16]}

            conn.execute(STAGING_TABLES_SQL)
            for table in _STAGE_COLUMNS:
                self._copy(conn, table, builder.paths[table])

            if dry_run:
                LOG.info("dry run: schema + staging COPY validated; not merging.")
                return {"dry_run": True, "loaded_rows": sum(counts.values())}

            with conn.transaction():
                run_id = conn.execute(
                    "INSERT INTO vocabulary_import_runs (source_id, fingerprint, started_at, status, record_count) "
                    "VALUES (%s, %s, now(), 'running', %s) RETURNING id",
                    (source_id, fp, sum(counts.values())),
                ).fetchone()["id"]
                conn.execute(MERGES_SQL)
                conn.execute(MERGE_CONFLICTS_SQL, (run_id,))
                conn.execute(MERGE_PROVENANCE_SQL, (run_id,))
                conn.execute(MERGE_QUALITY_SQL, (run_id,))
                conn.execute(
                    "UPDATE vocabulary_import_runs SET status='success', completed_at=now() WHERE id=%s",
                    (run_id,),
                )
                # deepen the transaction: restore autocommit semantics for psycopg3
            LOG.info("load complete: run=%s loaded_rows=%s", run_id, sum(counts.values()))
            return {"skipped": False, "run_id": run_id, "fingerprint": fp[:16]}

    def _copy(self, conn, table: str, csv_path: Path) -> None:
        if not csv_path.exists():
            LOG.warning("missing CSV for %s", table)
            return
        try:
            with csv_path.open("r", encoding="utf-8", newline="") as fh:
                with conn.cursor() as cur:
                    with cur.copy(f"COPY {table} FROM STDIN WITH (FORMAT csv, NULL '')") as copy:
                        copy.write(fh.read())
        except Exception as exc:  # pragma: no cover
            LOG.error("COPY failed for %s: %s", table, exc)
            raise


def _source_id_for(conn, name: str) -> int:
    row = conn.execute(
        "INSERT INTO vocabulary_sources (name, version) VALUES (%s, %s) "
        "ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        (name, "pipeline"),
    ).fetchone()
    conn.commit()
    return row["id"]
