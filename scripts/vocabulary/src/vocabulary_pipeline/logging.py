"""Structured logging for the pipeline with periodic progress helpers."""

from __future__ import annotations

import logging
import sys
import time

LOG = logging.getLogger("vocabulary_pipeline")


def setup_logging(level: str = "INFO") -> None:
    """Configure a single root logger writing to stderr."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        )
    )
    root = logging.getLogger("vocabulary_pipeline")
    root.setLevel(level.upper())
    root.addHandler(handler)
    root.propagate = False


class ProgressReporter:
    """Periodic progress reporting for large streaming jobs.

    Emits one log line every ``report_every`` records plus a final summary.
    """

    def __init__(self, description: str, report_every: int = 250_000) -> None:
        self.description = description
        self.report_every = report_every
        self.count = 0
        self.started = time.monotonic()
        self.last = self.started

    def tick(self, step: int = 1) -> None:
        self.count += step
        if self.count % self.report_every == 0:
            now = time.monotonic()
            elapsed = now - self.started
            rate = self.count / elapsed if elapsed > 0 else 0.0
            LOG.info(
                "%s: processed %s — elapsed %.1fs — rate %.0f records/s",
                self.description,
                f"{self.count:,}",
                elapsed,
                rate,
            )
            self.last = now

    def summary(self, **extras: int) -> None:
        elapsed = time.monotonic() - self.started
        parts = [f"{self.description}: total {self.count:,}", f"elapsed {elapsed:.1f}s"]
        for key, value in extras.items():
            parts.append(f"{key} {value:,}")
        LOG.info(" — ".join(parts))
