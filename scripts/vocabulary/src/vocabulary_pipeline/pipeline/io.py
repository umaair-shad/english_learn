"""Pipeline stage orchestration, checkpointing and staged-output IO.

Each stage writes:

* a ``.jsonl`` data file (append-capable, line-oriented, streamable);
* a ``manifest.json`` recording status, counts and fingerprints so that
  completed stages are reusable via ``--resume``.
"""

from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path
from typing import Any, Iterator

from ..logging import LOG

STAGE_NAMES = ["extract", "normalize", "reconcile", "validate", "load", "export"]


def jsonl_writer(path: Path, gzip_output: bool = False):
    """Return a context-managed writer object with a ``write(dict)`` method."""
    return _JsonlWriter(path, gzip_output)


def iter_jsonl(path: Path, skip_bad: bool = True) -> Iterator[dict]:
    """Stream lines from a JSONL (optionally gzipped) file as dicts."""
    open_fn = gzip.open if str(path).endswith(".gz") else path.open
    with open_fn("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                LOG.error("invalid JSON line in %s: %.120s", path, line)
                if not skip_bad:
                    raise


def file_sha256(path: Path, blocks: int = 16) -> str:
    """Cheap fingerprinting: hash of first and last blocks + size."""
    hasher = hashlib.sha256()
    try:
        if path.stat().st_size == 0:
            return hasher.hexdigest()
        with path.open("rb") as fh:
            head = fh.read(1 << 20 * blocks)
            hasher.update(head)
            if fh.seekable():
                fh.seek(-min(path.stat().st_size, 1 << 20 * blocks), 2)
                hasher.update(fh.read())
        hasher.update(str(path.stat().st_size).encode())
    except OSError:
        return ""
    return hasher.hexdigest()


class _JsonlWriter:
    def __init__(self, path: Path, gzip_output: bool = False) -> None:
        self.path = path
        self.gzip_output = gzip_output
        open_fn = gzip.open if gzip_output else path.open
        self._fh = open_fn(
            ("a" if gzip_output else "a"), encoding="utf-8", newline="\n"
        )

    def write(self, obj: dict) -> None:
        self._fh.write(json.dumps(obj, ensure_ascii=False) + "\n")

    def close(self) -> None:
        self._fh.close()

    def __enter__(self) -> "_JsonlWriter":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


class Manifest:
    """Tracks stage completion so failures do not force full restarts."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.data: dict[str, Any] = {}
        if path.exists():
            try:
                self.data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                LOG.warning("manifest %s unreadable, starting fresh", path)

    def stage_path(self, stage: str, name: str) -> Path:
        return self.path.parent / f"{stage}_{name}.jsonl"

    def is_complete(self, stage: str) -> bool:
        stage_data = self.data.get(stage)
        if not stage_data or stage_data.get("status") != "complete":
            return False
        key = f"{stage}_data"
        return bool(stage_data.get(key))

    def record_output(
        self, stage: str, summary: dict[str, Any], data_path: Path | None = None
    ) -> None:
        self.data[stage] = {
            "status": "complete",
            "summary": summary,
            "data_path": str(data_path) if data_path else None,
        }
        self.save()

    def mark_running(self, stage: str) -> None:
        self.data[stage] = {**self.data.get(stage, {}), "status": "running"}
        self.save()

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8")
