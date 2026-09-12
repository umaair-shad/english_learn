"""Streaming exporters: CSV, Excel and JSON.

Because nested relationships do not map perfectly into flat formats, the
documented export shape is *sense-centric*: one row per (entry, sense) with
scalar fields plus delimited child values (translations, CEFR claims, synsets).

JSON is streamed as JSONL (one object per sense) so the export never loads the
whole vocabulary into memory.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from ..logging import LOG
from ..pipeline.io import iter_jsonl


class Exporter:
    """Assembles export rows lazily from processed canonical files."""

    def __init__(self, processed_dir: Path) -> None:
        self.processed_dir = processed_dir
        self.trans_by_sense: dict[str, list[str]] = defaultdict(list)
        self.cefr_by_sense: dict[str, list[str]] = defaultdict(list)
        self.wn_by_sense: dict[str, list[str]] = defaultdict(list)

    def _preload_indexes(self) -> None:
        for tr in iter_jsonl(self.processed_dir / "canonical_translations.jsonl"):
            key = f"{tr['entry_key']}|{tr['sense_position']}"
            self.trans_by_sense[key].append(tr["text"])
        for c in iter_jsonl(self.processed_dir / "cefr_assignments.jsonl"):
            key = f"{c['entry_key']}|{c['sense_position']}"
            self.cefr_by_sense[key].append(f"{c['source']}:{c['level']}")
        for m in iter_jsonl(self.processed_dir / "sense_synsets.jsonl"):
            key = f"{m['entry_key']}|{m['sense_position']}"
            self.wn_by_sense[key].append(m["synset_id"])

    def iter_rows(self):
        self._preload_indexes()
        freq: dict[str, int] = {}
        for f in iter_jsonl(self.processed_dir / "frequency_data.jsonl"):
            freq.setdefault(f["entry_key"], f["rank"])
        for s in iter_jsonl(self.processed_dir / "canonical_senses.jsonl"):
            key = f"{s['entry_key']}|{s['position']}"
            yield {
                "lemma": s.get("lemma", ""),
                "normalized_lemma": s.get("normalized_lemma", ""),
                "part_of_speech": s.get("part_of_speech", ""),
                "sense_position": s.get("position", 0),
                "definition": s.get("definition", ""),
                "tags": "|".join(s.get("tags") or []),
                "polish_translations": "|".join(dict.fromkeys(self.trans_by_sense.get(key, []))),
                "cefr": "|".join(dict.fromkeys(self.cefr_by_sense.get(key, []))),
                "wordnet_synsets": "|".join(dict.fromkeys(self.wn_by_sense.get(key, []))),
                "frequency_rank": freq.get(s["entry_key"], ""),
            }

    def export_csv(self, path: Path) -> int:
        header = [
            "lemma", "normalized_lemma", "part_of_speech", "sense_position",
            "definition", "tags", "polish_translations", "cefr",
            "wordnet_synsets", "frequency_rank",
        ]
        count = 0
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=header)
            writer.writeheader()
            for row in self.iter_rows():
                writer.writerow(row)
                count += 1
        LOG.info("csv export written: %s rows -> %s", count, path)
        return count

    def export_jsonl(self, path: Path) -> int:
        count = 0
        with path.open("w", encoding="utf-8", newline="\n") as fh:
            for row in self.iter_rows():
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                count += 1
        LOG.info("jsonl export written: %s rows -> %s", count, path)
        return count

    def export_excel(self, path: Path) -> int:
        try:
            import openpyxl  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "openpyxl is required for Excel export: pip install 'vocabulary-pipeline[excel]'"
            ) from exc
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "vocabulary"
        header = [
            "lemma", "normalized_lemma", "part_of_speech", "sense_position",
            "definition", "tags", "polish_translations", "cefr",
            "wordnet_synsets", "frequency_rank",
        ]
        sheet.append(header)
        count = 0
        for row in self.iter_rows():
            sheet.append([row[h] for h in header])
            count += 1
            if count % 25_000 == 0:
                LOG.info("excel export progress: %s rows", count)
        workbook.save(str(path))
        LOG.info("excel export written: %s rows -> %s", count, path)
        return count
