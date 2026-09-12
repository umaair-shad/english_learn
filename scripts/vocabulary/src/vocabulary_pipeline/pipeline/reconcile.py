"""Stage: reconcile — merge all sources into one sense-based vocabulary.

Responsibilities (documented in docs/vocabulary-reconciliation.md):

* final-position sense numbering per entry
* Polish translation→sense matching (confidence-scored)
* CEFR (CEFR-J A1–B2 + Octanove C1–C2) attachment with honest confidence
* NGSL lemma-level frequency attachment
* sense→synset matching against Open English WordNet
* synset-level semantic relationships
* provenance records for every merged value
* conflict capture (validation and reports live in the validate stage)
"""

from __future__ import annotations

import shutil
from collections import defaultdict

from ..logging import LOG
from ..matching import cefr as cefr_match
from ..matching import wordnet as wn_match
from ..matching.translations import match_translation_to_senses
from .io import Manifest, iter_jsonl, jsonl_writer


def run(manifest: Manifest, cfg) -> dict:
    if manifest.is_complete("reconcile"):
        LOG.info("[reconcile] already complete, skipping")
        return manifest.data["reconcile"]["summary"]

    manifest.mark_running("reconcile")
    staging = cfg.staging_dir
    out = cfg.processed_dir
    out.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------------- read
    senses_by_entry: dict[str, list[dict]] = defaultdict(list)
    entries: dict[str, dict] = {}
    for row in iter_jsonl(staging / "canonical_entries.jsonl"):
        entries[row["entry_key"]] = row
    for row in iter_jsonl(staging / "canonical_senses.jsonl"):
        senses_by_entry[row["entry_key"]].append(row)

    synsets: dict[str, dict] = {
        row["synset_id"]: row
        for row in iter_jsonl(staging / "canonical_wordnet_synsets.jsonl")
    }
    wn_by_key: dict[str, list[dict]] = defaultdict(list)
    for row in iter_jsonl(staging / "canonical_wordnet_entries.jsonl"):
        key = f"{row['normalized_lemma']}|{row['pos']}"
        wn_by_key[key].append(row)

    # ------------------------------------------------------- renumber + link
    ordinal_map: dict[tuple[str, int], int] = {}

    with (
        jsonl_writer(out / "canonical_senses.jsonl") as sense_out,
        jsonl_writer(out / "canonical_translations.jsonl") as trans_out,
        jsonl_writer(out / "canonical_examples.jsonl") as ex_out,
        jsonl_writer(out / "rejected_senses.jsonl") as rejected_senses,
        jsonl_writer(out / "rejected_translations.jsonl") as rejected_trans,
        jsonl_writer(out / "provenance_records.jsonl") as prov_out,
    ):
        for entry_key, senses in senses_by_entry.items():
            senses.sort(key=lambda s: s["source_position_ordinal"])
            if not senses:
                rejected_senses.write({"entry_key": entry_key, "reason": "no_definition"})
            for position, sense in enumerate(senses):
                sense["position"] = position
                ordinal_map[(entry_key, sense["source_position_ordinal"])] = position
                sense_out.write(sense)
                _prov(
                    prov_out, "sense", _entity_key(entry_key, position),
                    "definition", "wiktextract", sense.get("source_record_id", ""),
                    "direct", "EXACT",
                )

        for row in iter_jsonl(staging / "canonical_examples.jsonl"):
            key = row["entry_key"]
            pos = ordinal_map.get((key, row["source_position_ordinal"]))
            if pos is None:
                continue
            row["sense_position"] = pos
            ex_out.write(row)

        translations = list(iter_jsonl(staging / "canonical_translations.jsonl"))
        by_record: dict[tuple[str, str], list[dict]] = defaultdict(list)
        for tr in translations:
            by_record[(tr["entry_key"], tr["source_record_id"])].append(tr)

        for (entry_key, sid), trs in by_record.items():
            record_senses = [
                s
                for s in senses_by_entry.get(entry_key, [])
                if s.get("source_record_id") == sid
            ]
            record_senses.sort(key=lambda s: s["source_position_ordinal"])
            candidates = []
            for s in record_senses:
                gloss = s.get("definition", "")
                raw = s.get("raw_definition", "")
                glosses = [g for g in (gloss, raw) if g] or [""]
                candidates.append({"glosses": glosses})
            for tr in trs:
                idx, score, confidence = match_translation_to_senses(
                    tr.get("sense_label", ""), candidates
                )
                if idx is None:
                    tr["confidence"] = confidence
                    tr["reason"] = f"no_sense_match score={score:.2f}"
                    rejected_trans.write(tr)
                    continue
                sense = record_senses[idx]
                position = ordinal_map[(entry_key, sense["source_position_ordinal"])]
                tr["sense_position"] = position
                tr["confidence"] = confidence
                tr["match_score"] = round(score, 3)
                trans_out.write(tr)
                _prov(
                    prov_out, "translation", _entity_key(entry_key, position),
                    "text", "wiktextract", sid, "sense_label_match", confidence,
                )

    # pass through read-only canonical artifacts so the validate/report/export
    # stages see a complete processed/ directory
    for name in ("canonical_entries", "canonical_wordnet_synsets", "canonical_wordnet_entries"):
        src = staging / f"{name}.jsonl"
        if src.exists():
            shutil.copyfile(src, out / f"{name}.jsonl")

    # ---------------------------------------------------------------- cefr
    cefr_index: dict[str, list[dict]] = defaultdict(list)
    for row in iter_jsonl(staging / "canonical_cefr.jsonl"):
        key = f"{row['normalized_lemma']}|{row['canonical_pos']}"
        cefr_index[key].append(row)

    cefr_applied = 0
    cefr_conflicts = 0
    with (
        jsonl_writer(out / "cefr_assignments.jsonl") as cefr_out,
        jsonl_writer(out / "conflicts.jsonl") as conflict_out,
    ):
        for key, rows in cefr_index.items():
            if key not in senses_by_entry:
                continue
            distinct_levels = sorted({r["level"] for r in rows})
            if len(distinct_levels) > 1:
                cefr_conflicts += 1
                conflict_out.write(
                    {
                        "field_name": "cefr_level",
                        "entity_key": key,
                        "sources": [r.get("source", "") for r in rows],
                        "values": distinct_levels,
                        "resolution": "all_claims_kept_for_review",
                        "requires_review": True,
                    }
                )
            for row in rows:
                method = "lemma+pos"
                confidence = "MEDIUM"
                review = True
                if row.get("source") == "octanove" and row.get("notes"):
                    idx, note_conf = cefr_match.match_notes_to_sense(
                        row["notes"],
                        [{"definition": s.get("definition", "")} for s in _sorted_senses(senses_by_entry[key])],
                    )
                    if idx is not None:
                        method = "lemma+pos+notes"
                        confidence = note_conf
                        review = False
                for position, sense in enumerate(_sorted_senses(senses_by_entry[key])):
                    cefr_out.write(
                        {
                            "entry_key": key,
                            "sense_position": position,
                            "lemma": row["lemma"],
                            "normalized_lemma": row["normalized_lemma"],
                            "level": row["level"],
                            "source": row.get("source", ""),
                            "source_version": row.get("source_version", ""),
                            "match_method": method,
                            "confidence": confidence,
                            "requires_review": review,
                        }
                    )
                    cefr_applied += 1

    # ---------------------------------------------------------------- frequency
    freq_index: dict[str, dict] = {}
    for row in iter_jsonl(staging / "canonical_frequency.jsonl"):
        freq_index.setdefault(row["normalized_lemma"], row)

    freq_applied = 0
    with jsonl_writer(out / "frequency_data.jsonl") as freq_out:
        for entry_key, entry in entries.items():
            freq = freq_index.get(entry["normalized_lemma"])
            if freq is None:
                continue
            freq_out.write(
                {
                    "entry_key": entry_key,
                    "lemma": entry["lemma"],
                    "rank": freq["rank"],
                    "sfi": freq["sfi"],
                    "frequency_per_million": freq["frequency_per_million"],
                    "source": "ngsl",
                    "source_version": freq.get("source_version", "1.2"),
                }
            )
            freq_applied += 1

    # ---------------------------------------------------------------- wordnet
    rel_count = 0
    wn_match_count = 0
    with (
        jsonl_writer(out / "semantic_relationships.jsonl") as rel_out,
        jsonl_writer(out / "sense_synsets.jsonl") as wn_match_out,
    ):
        for synset_id, synset in synsets.items():
            for rel_type, targets in (synset.get("relations") or {}).items():
                for target in targets:
                    if target in synsets:
                        rel_out.write(
                            {
                                "source_synset_id": synset_id,
                                "relationship_type": rel_type,
                                "target_synset_id": target,
                                "source": "wordnet",
                            }
                        )
                        rel_count += 1

        for entry_key, senses in _sorted_senses_each(senses_by_entry).items():
            candidates = wn_by_key.get(entry_key) or []
            candidate_synsets = []
            for cand in candidates:
                for s in cand.get("senses", []):
                    if s.get("synset") in synsets:
                        candidate_synsets.append(synsets[s["synset"]])
            if not candidate_synsets:
                continue
            for sense in senses:
                gloss = sense.get("definition", "")
                synset_id, score, confidence = wn_match.match_sense_to_synsets(
                    gloss, candidate_synsets, min_score=cfg.min_gloss_similarity / 100.0
                )
                if synset_id is None:
                    continue
                sense_pos = sense["position"]
                wn_match_out.write(
                    {
                        "entry_key": entry_key,
                        "sense_position": sense_pos,
                        "synset_id": synset_id,
                        "match_method": "gloss_similarity",
                        "confidence": confidence,
                        "score": round(score, 3),
                    }
                )
                wn_match_count += 1

    LOG.info(
        "reconcile done: cefr=%s conflicts=%s freq=%s wn_matches=%s rels=%s",
        cefr_applied, cefr_conflicts, freq_applied, wn_match_count, rel_count,
    )
    summary = {
        "entries": len(entries),
        "senses": sum(len(v) for v in senses_by_entry.values()),
        "cefr_assignments": cefr_applied,
        "cefr_conflicts": cefr_conflicts,
        "frequency_entries": freq_applied,
        "sense_synset_matches": wn_match_count,
        "semantic_relationships": rel_count,
    }
    manifest.record_output("reconcile", summary, out)
    return summary


def _sorted_senses(senses: list[dict]) -> list[dict]:
    return sorted(senses, key=lambda s: s.get("source_position_ordinal", 0))


def _sorted_senses_each(senses_by_entry: dict[str, list[dict]]) -> dict[str, list[dict]]:
    result = {}
    for key, senses in senses_by_entry.items():
        result[key] = sorted(senses, key=lambda s: s.get("source_position_ordinal", 0))
    return result


def _entity_key(entry_key: str, position: int) -> str:
    return f"{entry_key}|{position}"


def _prov(
    writer,
    entity_type: str,
    entity_key: str,
    field: str,
    source: str,
    source_record_id: str,
    method: str,
    confidence: str,
) -> None:
    writer.write(
        {
            "entity_type": entity_type,
            "entity_key": entity_key,
            "field_name": field,
            "source": source,
            "source_version": "",
            "source_record_id": source_record_id,
            "match_method": method,
            "confidence": confidence,
        }
    )
