"""Wiktextract / Kaikki streaming extractor.

Processes the 24.7 GB English-JSONL dump line-by-line with bounded memory.
Each line is one JSON object for one word+POS (and sometimes one etymology).
Records are emitted as English-only *source records* for the normalize stage.

Memory stays O(1) per line: we never buffer the whole file, and we drop the
verbose fields (etymology templates, sounds, head_templates) that Phase 1 does
not map into the canonical model.
"""

from __future__ import annotations

import gzip
import json
import zlib
from pathlib import Path
from typing import Iterator

from ..logging import LOG, ProgressReporter
from ..normalization.language import is_primary_language, is_target_translation
from ..normalization.pos import canonicalize_pos

SOURCE = "wiktextract"
SOURCE_VERSION = "kaikki-wiktextract-snapshot (unpinned; see docs/vocabulary-sources.md)"
ENGLISH_FUN_POS = {  # POS values whose senses are never learning items
    "name",
}


def open_stream(path: Path) -> Iterator[bytes]:
    """Open a possibly-gzipped raw bytes stream."""
    with path.open("rb") as fh:
        magic = fh.read(2)
        fh.seek(0)
        if magic == b"\x1f\x8b":
            yield from gzip.GzipFile(fileobj=fh)
        elif magic[:2] == b"\x78\x9c":
            # zlib/gzip-compatible stream (rare); Python handles some magics.
            yield from zlib.decompressobj().decompress(fh.read())
        else:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                yield chunk


def iter_records(
    path: Path, limit: int | None = None, report_every: int = 250_000
) -> Iterator[tuple[dict, int]]:
    """Stream JSONL records as dicts.

    English lines are located on the raw bytes (``"lang_code": "en"``) before
    any JSON parsing, so non-English lines are skipped at C speed. Only lines
    matching the language marker are decoded and parsed. Lines are split at the
    byte level once per chunk, so a chunk boundary can never cut a multi-byte
    UTF-8 character in half (an entire line is always decoded atomically).

    ``limit`` bounds the number of *English* records retained (used by sample
    mode), not total lines read.
    """
    reporter = ProgressReporter(f"wiktextract {path.name}", report_every)
    retained = 0
    line_number = 0
    tail = b""
    for chunk in open_stream(path):
        if not chunk:
            continue
        data = tail + chunk
        lines = data.split(b"\n")
        if data.endswith(b"\n"):
            tail = b""
            lines = lines[:-1]
        else:
            tail = lines.pop()
        for raw in lines:
            line_number += 1
            if not raw.strip():
                continue
            if b'"lang_code": "en"' not in raw:
                continue
            try:
                record = json.loads(raw.decode("utf-8", errors="replace"))
            except json.JSONDecodeError:
                LOG.warning(
                    "wiktextract: invalid JSON on line %s (skipped)", line_number
                )
                continue
            reporter.tick()
            if not is_primary_language(record.get("lang_code")):
                continue
            retained += 1
            if limit is not None and retained > limit:
                reporter.summary()
                return
            yield record, line_number
    reporter.summary()


def extract_sense(sense: dict) -> dict:
    """Keep only the sense fields the pipeline needs."""
    glosses = sense.get("glosses") or []
    raw_glosses = sense.get("raw_glosses") or []
    return {
        "glosses": [str(g) for g in glosses],
        "raw_glosses": [str(g) for g in raw_glosses],
        "tags": [str(t) for t in sense.get("tags") or []],
        "examples": [
            {
                "text": str(e.get("text", "")),
                "type": str(e.get("type", "example")),
                "ref": str(e.get("ref", "")),
            }
            for e in sense.get("examples") or []
            if e.get("text")
        ],
        "senseid": str(sense.get("senseid", "")),
        "wikidata": str(sense.get("wikidata", "")),
    }


def extract_translation(t: dict) -> dict | None:
    """Keep a translation record if it is a Polish translation."""
    if not is_target_translation(t.get("lang_code") or t.get("code")):
        return None
    word = t.get("word") or t.get("alt") or ""
    if not word:
        return None
    return {
        "word": str(word),
        "roman": str(t.get("roman", "") or ""),
        "tags": [str(x) for x in t.get("tags") or []],
        "sense": str(t.get("sense", "") or ""),
    }


def extract_record(record: dict, line_number: int) -> dict | None:
    """Build a minimal English source record, or None to reject."""
    word = record.get("word")
    if not word:
        LOG.warning("wiktextract line %s: missing word, rejected", line_number)
        return None
    pos_raw = record.get("pos", "")
    pos = canonicalize_pos(pos_raw)
    if pos in ENGLISH_FUN_POS:
        return None

    senses = []
    for sense in record.get("senses") or []:
        extracted = extract_sense(sense)
        if extracted["glosses"]:
            senses.append(extracted)

    translations = []
    for t in record.get("translations") or []:
        pl = extract_translation(t)
        if pl:
            translations.append(pl)

    return {
        "word": str(word),
        "pos": pos_raw,
        "canonical_pos": pos,
        "lang_code": record.get("lang_code"),
        "lang": record.get("lang"),
        "senses": senses,
        "translations": translations,
        "forms": [str(f.get("form", "")) for f in record.get("forms") or []],
        "etymology_number": record.get("etymology_number", ""),
        "source_record_id": f"line:{line_number}",
    }


def extract(
    wiktextract_path: Path,
    out_path: Path,
    limit: int | None = None,
    resume: bool = False,
) -> dict:
    """Extract English records to a JSONL staging file.

    Returns summary counts. With ``resume`` the writer appends to an existing
    staging file instead of truncating it (line numbers remain stable because
    each staging line already stores its source line number).
    """
    reject_all = 0
    retain = 0
    mode = "a" if resume else "w"
    reporter = ProgressReporter("wiktextract extract", 250_000)

    seen_source_ids: set[str] = set()
    if resume and out_path.exists():
        import json as _json

        with out_path.open("r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    obj = _json.loads(line)
                except Exception:
                    continue
                seen_source_ids.add(obj.get("source_record_id", ""))
        LOG.info("wiktextract resume: %s records already in staging", len(seen_source_ids))

    written = 0
    with out_path.open(mode, encoding="utf-8", newline="\n") as out:
        for record, line_number in iter_records(wiktextract_path, limit=limit):
            reporter.count = 0
            extracted = extract_record(record, line_number)
            if extracted is None:
                if record.get("lang_code") == "en":
                    reject_all += 1
                continue
            sid = extracted["source_record_id"]
            if sid in seen_source_ids:
                continue
            seen_source_ids.add(sid)
            out.write(json.dumps(extracted, ensure_ascii=False) + "\n")
            written += 1
            retain += 1

    LOG.info(
        "wiktextract extract complete: english retained=%s written=%s",
        f"{retain:,}",
        f"{written:,}",
    )
    return {"retained": retain, "written": written, "rejected_non_target": reject_all}
