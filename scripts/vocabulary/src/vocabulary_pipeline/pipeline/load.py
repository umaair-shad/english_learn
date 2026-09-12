"""Stage: load — bulk-import processed canonical data into PostgreSQL."""

from __future__ import annotations

from ..database.bulk_load import BulkLoader
from .io import Manifest


def run(manifest: Manifest, cfg, dry_run: bool = False, skip_fingerprint: bool = False) -> dict:
    loader = BulkLoader(cfg)
    result = loader.load(dry_run=dry_run, skip_fingerprint=skip_fingerprint)
    manifest.record_output("load", {"status": "complete" if not result.get("skipped") else "skipped", "result": result})
    return result
