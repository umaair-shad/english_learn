"""Stage: export — write portable CSV / Excel / JSON exports."""

from __future__ import annotations

from ..exports.streaming import Exporter
from ..logging import LOG
from .io import Manifest


def run(manifest: Manifest, cfg, formats: list[str] | None = None) -> dict:
    formats = formats or ["csv", "json"]
    exporter = Exporter(cfg.processed_dir)
    results: dict[str, int] = {}
    for fmt in formats:
        if fmt == "csv":
            results["csv"] = exporter.export_csv(cfg.exports_dir / "vocabulary_export.csv")
        elif fmt == "json":
            results["json"] = exporter.export_jsonl(cfg.exports_dir / "vocabulary_export.jsonl")
        elif fmt == "excel":
            results["excel"] = exporter.export_excel(cfg.exports_dir / "vocabulary_export.xlsx")
        else:
            LOG.error("unknown export format %r", fmt)
    manifest.record_output("export", {"rows": results, "formats": formats})
    return results
