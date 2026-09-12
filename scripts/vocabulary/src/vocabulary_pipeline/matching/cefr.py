"""CEFR reconciliation logic.

CEFR-J and Octanove are word+dictionary-POS level datasets. They cannot, by
themselves, distinguish senses. The honest strategy:

1. Match a CEFR row to a canonical entry keyed by (normalized lemma, POS).
2. Attach the level to every sense of that entry, but mark the match as
   ``ENTRY_LEVEL`` confidence with ``requires_review=True``.
3. Where a source provides sense-hint notes (Octanove ``notes``), try to
   match the notes against a sense gloss to upgrade confidence to sense-level.

Conflicts (same entry claimed by two sources or duplicated rows) are recorded,
never silently overwritten.
"""

from __future__ import annotations

from ..models.canonical import CONFIDENCE_MEDIUM
from . import token_bigram_similarity


def match_notes_to_sense(notes: str, senses: list[dict]) -> tuple[int | None, str]:
    """If Octanove `notes` resemble one sense's gloss, return its index."""
    if not notes:
        return None, CONFIDENCE_MEDIUM
    best_idx = None
    best_score = 0.0
    for idx, sense in enumerate(senses):
        gloss = sense.get("definition") or ""
        score = token_bigram_similarity(notes, gloss)
        if score > best_score:
            best_score = score
            best_idx = idx
    if best_idx is not None and best_score >= 0.55:
        return best_idx, "EXACT" if best_score >= 0.8 else "HIGH"
    return None, CONFIDENCE_MEDIUM
