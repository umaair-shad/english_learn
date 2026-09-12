"""Stage: extract — acquire and stream raw source records into staging."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..logging import LOG
from ..sources import cefr_j, ngsl, octanove, wiktextract, wordnet
from .io import Manifest

EXTRACT_SOURCES = {
    "wiktextract": wiktextract.extract,
    "cefr_j": cefr_j.load,
    "octanove": octanove.load,
    "wordnet": wordnet.load,
    "ngsl": ngsl.load,
}


@dataclass
class OutputPaths:
    data: Path
    entries: Path
    synsets: Path


def run(
    manifest: Manifest,
    cfg,
    sources: list[str] | None = None,
    limit: int | None = None,
    resume: bool = False,
) -> dict:
    """Extract sources into staging files. Returns a combined summary."""
    if sources is None:
        sources = ["wiktextract", "cefr_j", "octanove", "wordnet", "ngsl"]

    summary: dict[str, dict] = {}

    for source in sources:
        if source not in EXTRACT_SOURCES:
            LOG.error("unknown source '%s'; choices: %s", source, list(EXTRACT_SOURCES))
            continue
        stage_key = f"extract_{source}"
        if resume and manifest.is_complete(stage_key):
            LOG.info("[extract %s] stage already complete, skipping", source)
            continue
        manifest.mark_running(stage_key)

        handler = EXTRACT_SOURCES[source]
        src_path = cfg.source_path(source)
        if not src_path.exists():
            LOG.error("source file for %s not found at %s", source, src_path)
            continue

        out_paths = _output_paths(manifest, source)
        if source == "wordnet":
            result = handler(src_path, out_paths.entries, out_paths.synsets)
        else:
            kwargs = {"limit": limit} if source == "wiktextract" else {}
            result = handler(src_path, out_paths.data, **kwargs)

        data_path = (
            out_paths.entries if source == "wordnet" else None
        )
        if source == "wordnet":
            data_path = out_paths.entries
            summary[source] = {
                "entries": result.get("entries", 0),
                "synsets": result.get("synsets", 0),
                "senses": result.get("senses", 0),
            }
        else:
            summary[source] = result
            data_path = out_paths.data
        manifest.record_output(stage_key, summary[source], data_path)

    return summary


def _output_paths(manifest: Manifest, source: str) -> OutputPaths:
    return OutputPaths(
        data=manifest.stage_path("extract", source),
        entries=manifest.stage_path("extract", source + "_entries"),
        synsets=manifest.stage_path("extract", source + "_synsets"),
    )
