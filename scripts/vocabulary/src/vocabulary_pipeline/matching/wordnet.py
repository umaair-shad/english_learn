"""WordNet sense-to-synset matching.

Wiktextract senses are matched to WordNet synsets through a two-step strategy:

1. Align entries via (normalized lemma, POS). Words like ``bank`` align at entry
   level; the *senses* then compete for the entry's synsets.
2. For each pair (wikt sense gloss, candidate synset definition) compute a
   token/bigram similarity. Sense-synset matches above the threshold are kept
   with a confidence label; everything below stays UNMATCHED (never guessed).

Synonyms for a matched sense come from the members of the winning synset.
"""

from __future__ import annotations

from ..models.canonical import CONFIDENCE_HIGH, CONFIDENCE_LOW, CONFIDENCE_MEDIUM
from . import gloss_affinity


def match_sense_to_synsets(
    gloss: str,
    synsets: list[dict],
    min_score: float = 0.25,
    margin: float = 0.12,
) -> tuple[str | None, float, str]:
    """Return ``(synset_id, score, confidence)`` for the best synset.

    Scores with ``gloss_affinity`` and keeps the winner only when it is
    meaningfully better than the runner-up (margin rule) so that weak
    lexical overlaps are never "guessed". Below the floor it stays UNMATCHED.
    """
    if not gloss or not synsets:
        return None, 0.0, CONFIDENCE_LOW
    ranked: list[tuple[str, float]] = []
    for synset in synsets:
        definition = synset.get("definition") or ""
        score = gloss_affinity(gloss, definition)
        ranked.append((synset.get("synset_id") or "", round(score, 4)))
    ranked.sort(key=lambda item: item[1], reverse=True)
    best_id, best_score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0.0
    if not best_id or best_score < min_score:
        return None, best_score, CONFIDENCE_LOW
    if best_score - runner_up < margin:
        return None, best_score, CONFIDENCE_LOW
    if best_score >= 0.6:
        return best_id, best_score, CONFIDENCE_HIGH
    if best_score >= 0.45:
        return best_id, best_score, CONFIDENCE_MEDIUM
    return best_id, best_score, CONFIDENCE_LOW
