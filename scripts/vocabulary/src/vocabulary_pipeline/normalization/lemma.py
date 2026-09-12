"""Lemma normalization for matching and canonical keys."""

from __future__ import annotations

from .text import lookup_normalize, simple_normalize


def normalize_lemma(lemma: str) -> str:
    """Canonical lemma key: NFKC, collapsed whitespace, lowercased, plain.

    Display casing is preserved separately by the caller storing ``lemma``.
    """
    return lookup_normalize(simple_normalize(lemma))


def split_variant_forms(headword: str) -> list[str]:
    """Split slash/variant headwords such as ``a.m./A.M./am/AM``.

    Returns the variants plus the raw headword. Used so that records with
    variant forms can still match canonical entries on any variant.
    """
    variants: list[str] = []
    headword = simple_normalize(headword)
    for chunk in headword.split("/"):
        chunk = chunk.strip()
        if chunk:
            variants.append(chunk)
    return variants
