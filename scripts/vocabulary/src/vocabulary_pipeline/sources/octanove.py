"""Octanove C1/C2 Vocabulary Profile loader (word+POS level, notes)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from ..logging import LOG
from ..normalization.lemma import normalize_lemma
from ..normalization.pos import canonicalize_pos

SOURCE = "octanove"
SOURCE_VERSION = "1.0"
SOURCE_LABEL = "octanove-vocabulary-profile-c1c2-1.0"

FIELD_NAMES = ["headword", "pos", "CEFR", "notes"]


def load(path: Path, out_path: Path) -> dict:
    rows = 0
    written = 0
    with path.open("r", encoding="utf-8", newline="") as fh, out_path.open(
        "w", encoding="utf-8", newline="\n"
    ) as out:
        reader = csv.DictReader(fh, fieldnames=FIELD_NAMES)
        next(reader, None)  # header
        for row in reader:
            if not row:
                continue
            headword = (row.get("headword") or "").strip()
            pos_raw = (row.get("pos") or "").strip()
            level = (row.get("CEFR") or "").strip().upper()
            if not headword or not level:
                continue
            rows += 1
            entry = {
                "lemma": headword,
                "normalized_lemma": normalize_lemma(headword),
                "pos": pos_raw,
                "canonical_pos": canonicalize_pos(pos_raw),
                "level": level,
                "notes": row.get("notes") or "",
                "source": SOURCE,
                "source_version": SOURCE_VERSION,
            }
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            written += 1
    LOG.info("octanove load: rows=%s written=%s", rows, written)
    return {"rows": rows, "written": written}
