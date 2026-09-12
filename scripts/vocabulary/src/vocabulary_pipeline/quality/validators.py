"""Automated quality validation rules.

Each rule inspects the canonical processed records and emits QualityIssue rows.
Rules are deliberate: they check invariants the downstream schema and the
learning product rely on (sense separation, stable IDs, non-empty fields,
valid enums, plausible CEFR, orphan-free linkage).
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from ..logging import LOG

VALID_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}
VALID_POS = {
    "noun", "verb", "adjective", "adverb", "pronoun", "determiner",
    "preposition", "prepositional phrase", "conjunction", "interjection",
    "numeral", "particle", "phrase", "symbol", "letter", "character",
    "prefix", "suffix", "infix", "contraction", "article", "punctuation",
    "postposition", "clitic", "idiom", "proverb", "romanization", "affix",
    "abbreviation", "unknown",
}
MAX_FIELD_LENGTHS = {
    "lemma": 256,
    "definition": 4000,
    "translation": 512,
    "sentence": 6000,
}
SEVERITY = {"error", "warning", "info"}


class Validator:
    """Collects issues then reports them in a structured way."""

    def __init__(self) -> None:
        self.issues: list[dict] = []

    def add(self, entity_type, entity_key, code, severity, message, payload=None):
        self.issues.append(
            {
                "entity_type": entity_type,
                "entity_key": entity_key,
                "issue_code": code,
                "severity": severity,
                "message": message,
                "payload": payload or {},
            }
        )

    def write(self, path: Path) -> int:
        with path.open("w", encoding="utf-8", newline="\n") as fh:
            for issue in self.issues:
                fh.write(json.dumps(issue, ensure_ascii=False) + "\n")
        LOG.info("quality issues written: %s", len(self.issues))
        return len(self.issues)


def validate_processed(cfg, out_issues_path: Path | None = None) -> dict:
    """Run all rules over the processed canonical files."""
    out = cfg.processed_dir
    v = Validator()

    # entries
    for row in _iter(out / "canonical_entries.jsonl"):
        if not row.get("lemma") or not row.get("normalized_lemma"):
            v.add("entry", row.get("entry_key", ""), "missing_word", "error", "entry without lemma")
        if row.get("part_of_speech") not in VALID_POS:
            v.add("entry", row.get("entry_key", ""), "invalid_pos", "error",
                  f"invalid POS {row.get('part_of_speech')!r}")

    # senses
    senses_by_entry: dict[str, int] = defaultdict(int)
    last_sense_keys: set[str] = set()
    for row in _iter(out / "canonical_senses.jsonl"):
        senses_by_entry[row["entry_key"]] += 1
        if not row.get("definition"):
            v.add("sense", row.get("entry_key", ""), "missing_definition", "error",
                  "sense without definition")
        defn = row.get("definition", "")
        if len(defn) > MAX_FIELD_LENGTHS["definition"]:
            v.add("sense", row.get("entry_key", ""), "overlong_definition", "warning",
                  f"definition length {len(defn)}")
        for char in defn:
            if ord(char) > 0x10FFFF or (0xD800 <= ord(char) <= 0xDFFF):
                v.add("sense", row.get("entry_key", ""), "bad_unicode", "error",
                      "sense definition contains surrogate/out-of-range char")
                break
        durty = f"{row['entry_key']}|{row.get('normalized_definition','')}|{sorted(row.get('tags') or [])}"
        if durty in last_sense_keys:
            v.add("sense", row.get("entry_key", ""), "duplicate_sense", "warning",
                  "duplicate sense key after reconcile")
        last_sense_keys.add(durty)

    for entry_key, count in sorted(senses_by_entry.items()):
        if count == 0:
            v.add("entry", entry_key, "missing_sense", "error", "entry with zero senses")

    # translations
    for row in _iter(out / "canonical_translations.jsonl"):
        if "sense_position" not in row:
            v.add("translation", row.get("entry_key", ""), "orphan_translation", "error",
                  "translation without resolved sense")
        text = row.get("text", "")
        if not text:
            v.add("translation", row.get("entry_key", ""), "malformed_translation", "error",
                  "empty translation text")
        elif len(text) > MAX_FIELD_LENGTHS["translation"]:
            v.add("translation", row.get("entry_key", ""), "overlong_translation", "warning",
                  f"translation length {len(text)}")

    # rejected translations (unmatched)
    unmatched = 0
    for row in _iter(out / "rejected_translations.jsonl"):
        unmatched += 1
    if unmatched:
        v.add("translation", "global", "translation_unmatched", "warning",
              f"{unmatched} translations could not be attached to a sense")

    # examples
    for row in _iter(out / "canonical_examples.jsonl"):
        if "sense_position" not in row:
            v.add("example", row.get("entry_key", ""), "orphan_example", "error",
                  "example without resolved sense")
        if len(row.get("text", "")) > MAX_FIELD_LENGTHS["sentence"]:
            v.add("example", row.get("entry_key", ""), "overlong_sentence", "info",
                  f"example length {len(row.get('text',''))}")

    # cefr
    for row in _iter(out / "cefr_assignments.jsonl"):
        if row.get("level") not in VALID_CEFR:
            v.add("cefr", row.get("entry_key", ""), "invalid_cefr", "error",
                  f"invalid CEFR {row.get('level')!r}")
        if row.get("confidence") not in {"EXACT", "HIGH", "MEDIUM", "LOW", "UNMATCHED"}:
            v.add("cefr", row.get("entry_key", ""), "invalid_confidence", "error",
                  f"invalid confidence {row.get('confidence')!r}")

    # wordnet
    synset_ids = set()
    for row in _iter(out / "canonical_wordnet_synsets.jsonl"):
        synset_ids.add(row["synset_id"])
        if not row.get("definition"):
            v.add("synset", row["synset_id"], "missing_definition", "warning",
                  "synset without definition")
    for row in _iter(out / "sense_synsets.jsonl"):
        if row.get("synset_id") not in synset_ids:
            v.add("sense_synset", row.get("entry_key", ""), "dangling_synset_ref", "error",
                  f"sense references unknown synset {row.get('synset_id')!r}")

    # frequency
    for row in _iter(out / "frequency_data.jsonl"):
        rank = row.get("rank")
        if rank is not None and (not isinstance(rank, int) or rank < 1):
            v.add("frequency", row.get("entry_key", ""), "invalid_frequency_rank", "error",
                  f"invalid rank {rank!r}")

    # conflicts
    for row in _iter(out / "conflicts.jsonl"):
        v.add(
            "conflict",
            row.get("entity_key", ""),
            "conflicting_source_values",
            "warning",
            f"field={row.get('field_name')} values={row.get('values')} resolution={row.get('resolution')}",
        )

    write_path = out_issues_path or (out / "quality_issues.jsonl")
    issue_count = v.write(write_path)
    return {"issues": issue_count, "errors": _count(v, "error"), "warnings": _count(v, "warning")}


def _count(v: Validator, severity: str) -> int:
    return sum(1 for i in v.issues if i["severity"] == severity)


def _iter(path: Path):
    if not path.exists():
        return iter(())
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                LOG.warning("bad json line in %s", path)
