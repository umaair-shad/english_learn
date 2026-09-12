"""CEFR-J Vocabulary Profile loader (A1-B2, word+POS level)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from ..logging import LOG
from ..normalization.lemma import normalize_lemma
from ..normalization.pos import canonicalize_pos

SOURCE = "cefr_j"
SOURCE_VERSION = "1.5"
SOURCE_LABEL = "cefr-j-vocabulary-profile-1.5"

FIELD_NAMES = ["headword", "pos", "CEFR", "CoreInventory 1", "CoreInventory 2", "Threshold"]


def load(path: Path, out_path: Path) -> dict:
    """Read the CSV and emit canonical rows for the reconcile stage."""
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
                "core_inventory_1": row.get("CoreInventory 1") or "",
                "core_inventory_2": row.get("CoreInventory 2") or "",
                "threshold": row.get("Threshold") or "",
                "source": SOURCE,
                "source_version": SOURCE_VERSION,
            }
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            written += 1
    LOG.info("cefr_j load: rows=%s written=%s", rows, written)
    return {"rows": rows, "written": written}
