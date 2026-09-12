"""Configuration for the vocabulary pipeline.

Paths are resolved from environment variables and never hard-coded for a
specific machine. ``DATA_ROOT`` defaults to the repository root (the parent of
``scripts/``) so that ``data/`` lives beside the code.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv() -> None:  # type: ignore[misc]
        return None


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DATA_ROOT = PROJECT_ROOT / "data"

SOURCE_NAMES = ("wiktextract", "cefr_j", "octanove", "wordnet", "ngsl")

SOURCE_FILES = {
    "wiktextract": "raw-wiktextract-data.jsonl/raw-wiktextract-data.jsonl",
    "cefr_j": "cefrj-vocabulary-profile-1.5.csv",
    "octanove": "octanove-vocabulary-profile-c1c2-1.0.csv",
    "wordnet": "english-wordnet-2025-json",
    "ngsl": "NGSL_1.2_stats.csv",
}


@dataclass(frozen=True)
class Config:
    """Immutable pipeline configuration resolved once at startup."""

    data_root: Path
    raw_dataset_dir: Path | None
    database_url: str | None
    log_level: str = "INFO"
    default_limit: int | None = None
    min_gloss_similarity: float = 58.0

    @property
    def raw_dir(self) -> Path:
        return self.data_root / "raw"

    @property
    def staging_dir(self) -> Path:
        return self.data_root / "staging"

    @property
    def processed_dir(self) -> Path:
        return self.data_root / "processed"

    @property
    def rejected_dir(self) -> Path:
        return self.data_root / "rejected"

    @property
    def reports_dir(self) -> Path:
        return self.data_root / "reports"

    @property
    def exports_dir(self) -> Path:
        return self.data_root / "exports"

    def source_path(self, source: str) -> Path:
        relative = SOURCE_FILES[source]
        candidates: list[Path] = []
        if self.raw_dataset_dir is not None:
            candidates.append(self.raw_dataset_dir / relative)
        candidates.append(self.raw_dir / relative)
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return candidates[0]


def load_config() -> Config:
    """Read environment variables / dotenv and build a Config."""
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    data_root_env = os.getenv("DATA_ROOT")
    data_root = Path(data_root_env) if data_root_env else DEFAULT_DATA_ROOT

    raw_dataset_env = os.getenv("RAW_DATASET_DIR")
    raw_dataset: Path | None = Path(raw_dataset_env) if raw_dataset_env else None

    limit_env = os.getenv("PIPELINE_LIMIT")
    limit = int(limit_env) if limit_env else None

    return Config(
        data_root=data_root,
        raw_dataset_dir=raw_dataset,
        database_url=os.getenv("DATABASE_URL"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        default_limit=limit,
        min_gloss_similarity=float(os.getenv("MIN_GLOSS_SIMILARITY", "58")),
    )


def ensure_directories(cfg: Config) -> None:
    """Create the data directory tree the pipeline relies on."""
    for attr in (
        "raw_dir",
        "staging_dir",
        "processed_dir",
        "rejected_dir",
        "reports_dir",
        "exports_dir",
    ):
        getattr(cfg, attr).mkdir(parents=True, exist_ok=True)
