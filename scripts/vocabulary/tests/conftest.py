"""Shared fixtures: build a full (in-memory) pipeline run from fixture data."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from vocabulary_pipeline.config import Config, ensure_directories
from vocabulary_pipeline.pipeline import export as export_stage
from vocabulary_pipeline.pipeline import extract as extract_stage
from vocabulary_pipeline.pipeline import normalize as normalize_stage
from vocabulary_pipeline.pipeline import reconcile as reconcile_stage
from vocabulary_pipeline.pipeline import validate as validate_stage
from vocabulary_pipeline.pipeline.io import Manifest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture()
def pipeline_run(tmp_path):
    """Run the full extract→normalize→reconcile→validate→export chain over fixtures."""
    raw = tmp_path / "raw"
    raw.mkdir()

    shutil.copytree(FIXTURES / "english-wordnet-2025-json", raw / "english-wordnet-2025-json")
    for name in (
        "cefrj-vocabulary-profile-1.5.csv",
        "octanove-vocabulary-profile-c1c2-1.0.csv",
        "NGSL_1.2_stats.csv",
    ):
        shutil.copyfile(FIXTURES / name, raw / name)

    # wiktextract lives in a directory named after itself containing the JSONL
    wt_dir = raw / "raw-wiktextract-data.jsonl"
    wt_dir.mkdir()
    shutil.copyfile(FIXTURES / "raw-wiktextract-data.jsonl", wt_dir / "raw-wiktextract-data.jsonl")

    cfg = Config(
        data_root=tmp_path / "data",
        raw_dataset_dir=raw,
        database_url=None,
        default_limit=None,
        min_gloss_similarity=25.0,
    )
    ensure_directories(cfg)
    manifest = Manifest(cfg.staging_dir / "manifest.json")

    extract_stage.run(manifest, cfg)
    normalize_stage.run(manifest, cfg)
    reconcile_stage.run(manifest, cfg)
    validate_stage.run(manifest, cfg)
    export_stage.run(manifest, cfg, formats=["csv", "json"])

    return {
        "cfg": cfg,
        "manifest": manifest,
        "processed": cfg.processed_dir,
        "reports": cfg.reports_dir,
        "exports": cfg.exports_dir,
        "staging": cfg.staging_dir,
    }


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(__import__("json").loads(line))
    return out
