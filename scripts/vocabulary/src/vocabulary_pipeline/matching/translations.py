"""Translation-to-sense matching.

Polish translations from Wiktextract carry a free-text ``sense`` label that must
be tied to one of the senses of the record that produced them. Matching is
confidence-scored. When no sense matches confidently, the translation is kept
as ``UNMATCHED`` so it can be reviewed rather than silently dropped.
"""

from __future__ import annotations

from ..models.canonical import CONFIDENCE_LOW, CONFIDENCE_MEDIUM, CONFIDENCE_UNMATCHED
from . import _tokenize, token_bigram_similarity


def score_sense_label(label: str, glosses: list[str]) -> float:
    """Best similarity between a translation sense-label and a sense's glosses.

    Short labels (``edge of river or lake``, ``institution``) match long
    glosses better with token-coverage than with bigram Dice alone: if every
    label token appears in the gloss, the label is considered contained (1.0).
    """
    if not label:
        return 0.0
    label_tokens = set(_tokenize(label))
    if not label_tokens:
        return 0.0
    best = 0.0
    for gloss in glosses:
        if not gloss:
            continue
        gloss_tokens = set(_tokenize(gloss))
        coverage = 1.0 if label_tokens <= gloss_tokens else (
            len(label_tokens & gloss_tokens) / len(label_tokens) if gloss_tokens else 0.0
        )
        sim = token_bigram_similarity(label, gloss)
        best = max(best, sim, coverage)
    return best


def classify(score: float) -> str:
    if score >= 0.62:
        return "HIGH"
    if score >= 0.38:
        return "MEDIUM"
    if score > 0.0:
        return "LOW"
    return CONFIDENCE_UNMATCHED


def match_translation_to_senses(
    sense_label: str,
    candidate_senses: list[dict],
    min_score: float = 0.25,
) -> tuple[int | None, float, str]:
    """Match one translation to a list of sense dicts with ``glosses``.

    Returns ``(sense_index_or_None, score, confidence)``.
    """
    if not sense_label:
        return None, 0.0, CONFIDENCE_UNMATCHED
    best_idx: int | None = None
    best_score = 0.0
    for idx, sense in enumerate(candidate_senses):
        glosses = sense.get("glosses") or []
        score = score_sense_label(sense_label, glosses)
        if score > best_score:
            best_score = score
            best_idx = idx
    if best_idx is None or best_score < min_score:
        return None, best_score, CONFIDENCE_UNMATCHED
    if best_score >= 0.62:
        return best_idx, best_score, "HIGH"
    return best_idx, best_score, CONFIDENCE_MEDIUM if best_score >= 0.38 else CONFIDENCE_LOW
