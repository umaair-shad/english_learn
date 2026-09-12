"""Deterministic text normalization utilities."""

from __future__ import annotations

import re
import unicodedata


def normalize_unicode(text: str, form: str = "NFKC") -> str:
    """Unicode normalization."""
    return unicodedata.normalize(form, text)


def collapse_whitespace(text: str) -> str:
    """Trim and collapse runs of whitespace to a single space."""
    return re.sub(r"\s+", " ", text).strip()


def clean_html(text: str) -> str:
    """Remove common HTML/markup fragments that leak into glosses."""
    text = re.sub(r"<[^>]+>", " ", text)
    return collapse_whitespace(text)


def simple_normalize(text: str) -> str:
    """Safe normalization used for display text.

    Does NOT lowercase: preserves display casing. Removes control
    characters, trims, collapses whitespace.
    """
    if not text:
        return ""
    text = text.replace("\u00ad", "")  # soft hyphen
    return collapse_whitespace(clean_html(normalize_unicode(text)))


def lookup_normalize(text: str) -> str:
    """Normalization for matching keys.

    Lowercases, strips diacritics to a plain ASCII key, removes punctuation.
    Used ONLY for building reproducible match keys, never for display.
    """
    if not text:
        return ""
    text = normalize_unicode(text, "NFKD")
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^\w\s'\-]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def escape_like(text: str) -> str:
    """Escape characters that have meaning inside SQL LIKE patterns."""
    return (
        text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
