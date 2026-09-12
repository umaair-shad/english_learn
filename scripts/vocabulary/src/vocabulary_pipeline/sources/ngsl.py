"""NGSL 1.2 loader (lemma-level frequency data)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from ..logging import LOG
from ..normalization.lemma import normalize_lemma

SOURCE = "ngsl"
SOURCE_VERSION = "1.2"
SOURCE_LABEL = "NGSL_1.2_stats"

FIELD_NAMES = ["Lemma", "SFI Rank", "SFI", "Adjusted Frequency per Million (U)"]


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
            lemma = (row.get("Lemma") or "").strip()
            if not lemma:
                continue
            try:
                rank = int(row.get("SFI Rank") or 0)
                sfi = float(row.get("SFI") or 0)
                u = float(row.get("Adjusted Frequency per Million (U)") or 0)
            except ValueError:
                LOG.warning("ngsl: unparsable numeric row %r", row)
                continue
            rows += 1
            entry = {
                "lemma": lemma,
                "normalized_lemma": normalize_lemma(lemma),
                "rank": rank,
                "sfi": sfi,
                "frequency_per_million": u,
                "source": SOURCE,
                "source_version": SOURCE_VERSION,
            }
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            written += 1
    LOG.info("ngsl load: rows=%s written=%s", rows, written)
    return {"rows": rows, "written": written}
