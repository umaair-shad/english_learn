"""Matching subpackage: confidence-scored sense/entry alignment."""

from __future__ import annotations

import re
from difflib import SequenceMatcher

try:
    from rapidfuzz import fuzz  # type: ignore

    RAPIDFUZZ_AVAILABLE = True
except ImportError:  # pragma: no cover
    RAPIDFUZZ_AVAILABLE = False

# Content-only matching ignores function words that add no signal.
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "at",
    "for", "with", "from", "by", "as", "is", "are", "was", "were", "be",
    "been", "being", "that", "this", "these", "those", "it", "its", "his",
    "her", "their", "them", "they", "he", "she", "we", "you", "i", "not",
    "no", "so", "such", "which", "who", "whom", "where", "when", "how",
    "if", "then", "than", "also", "one", "two", "some", "any", "each",
    "other", "esp", "especially", "usually", "may", "can", "will",
    "into", "over", "under", "up", "down", "out", "off", "about", "between",
    "through", "during", "before", "after", "above", "below", "upon",
    "there", "here", "more", "most", "least", "very", "often", "made",
    "used", "via", "tend", "tends",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z'\-]+", text.lower())


def content_tokens(text: str) -> list[str]:
    """Lowercased significant tokens; empty words and stopwords removed."""
    return [t for t in _tokenize(text) if t not in STOPWORDS and len(t) > 1]


def token_bigram_similarity(a: str, b: str) -> float:
    """Bigram Dice on token sequences, 0..1. Robust for gloss matching."""
    ta = _tokenize(a)
    tb = _tokenize(b)
    if not ta or not tb:
        return 0.0
    if ta == tb:
        return 1.0
    set_a = set(ta)
    set_b = set(tb)
    overlap = len(set_a & set_b)
    dice = 2 * overlap / (len(set_a) + len(set_b)) if (set_a or set_b) else 0.0
    bigram_a = {" ".join((ta[i], ta[i + 1])) for i in range(max(0, len(ta) - 1))}
    bigram_b = {" ".join((tb[i], tb[i + 1])) for i in range(max(0, len(tb) - 1))}
    if bigram_a or bigram_b:
        dice = 0.6 * dice + 0.4 * (
            2 * len(bigram_a & bigram_b) / (len(bigram_a) + len(bigram_b))
        )
    return dice


def gloss_affinity(a: str, b: str) -> float:
    """Content-based affinity between two glosses, 0..1.

    Combines token dice, coverage of the shorter text by shared content
    tokens, and bigram agreement. Stopwords are ignored so that
    ``institution / financial`` style anchors drive the score.
    """
    ta = content_tokens(a)
    tb = content_tokens(b)
    if not ta or not tb:
        return 0.0
    if set(ta) == set(tb):
        return 1.0
    shared = len(set(ta) & set(tb))
    dice = 2 * shared / (len(ta) + len(tb))
    coverage = shared / min(len(ta), len(tb))
    ba = {" ".join((ta[i], ta[i + 1])) for i in range(len(ta) - 1)} if len(ta) > 1 else set()
    bb = {" ".join((tb[i], tb[i + 1])) for i in range(len(tb) - 1)} if len(tb) > 1 else set()
    bigram_dice = (
        2 * len(ba & bb) / (len(ba) + len(bb)) if (ba or bb) else 0.0
    )
    return round(0.5 * dice + 0.35 * coverage + 0.15 * bigram_dice, 4)


def string_similarity(a: str, b: str) -> float:
    """Token-sequence similarity: rapidfuzz if installed, else difflib."""
    if RAPIDFUZZ_AVAILABLE:
        return fuzz.token_set_ratio(a, b) / 100.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def is_substring_or_overlap(label: str, gloss: str) -> float:
    """Return 1.0 if label is a strong substring of gloss, else 0."""
    label = label.strip().lower()
    gloss = gloss.strip().lower()
    if not label:
        return 0.0
    if label in gloss:
        return 1.0
    return 0.0


def best_match(
    query: str,
    candidates: list[tuple[str, str]],
    min_score: float = 0.12,
) -> tuple[int, float, str]:
    """Pick the best candidate for ``query``.

    Candidates are ``(candidate_text, candidate_id)``. Returns
    ``(candidate_id, score, method)`` where method is one of
    ``exact|contains|similar|none``.
    """
    if not candidates:
        return 0, 0.0, "none"
    # exact match
    q = query.strip().lower()
    for text, cid in candidates:
        if text.strip().lower() == q:
            return int(cid), 1.0, "exact"
    # strong containment
    for text, cid in candidates:
        if q and q in text.strip().lower():
            return int(cid), 1.0, "contains"
        if text.strip() and text.strip().lower() in q:
            return int(cid), 0.9, "contains"
    # normalized token/bigram similarity
    scored = []
    for text, cid in candidates:
        score = token_bigram_similarity(query, text)
        scored.append((score, int(cid), text))
    scored.sort(reverse=True, key=lambda x: x[0])
    top_score, top_id, _ = scored[0]
    if top_score >= max(min_score, 0.5):
        return top_id, top_score, "similar"
    return 0, top_score, "none"
