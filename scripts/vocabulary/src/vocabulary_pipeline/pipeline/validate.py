"""Stage: validate — run quality rules and generate reports."""

from __future__ import annotations

from ..logging import LOG
from ..quality.reporting import generate
from ..quality.validators import validate_processed
from .io import Manifest


def run(manifest: Manifest, cfg) -> dict:
    if manifest.is_complete("validate"):
        LOG.info("[validate] already complete, skipping")
        return manifest.data["validate"]["summary"]

    manifest.mark_running("validate")
    result = validate_processed(cfg)
    summary = generate(cfg, validate_result=result)
    summary["validation"] = result
    manifest.record_output("validate", summary)
    LOG.info(
        "[validate] issues=%s errors=%s warnings=%s",
        result["issues"], result["errors"], result["warnings"],
    )
    return summary
