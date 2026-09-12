"""Language helpers and filtering rules."""

from __future__ import annotations

# Languages we import as primary entries.
PRIMARY_LANGUAGE = "en"

# The translation language we extract as the primary target.
TARGET_LANGUAGE = "pl"

# lang_code values that are explicitly excluded even if they look English-ish.
EXCLUDED_LANGUAGE_CODES = {
    "enm",  # Middle English
    "enm-esc",  # Early Scots
    "sco",  # Scots
    "ang",  # Old English
}


def is_primary_language(lang_code: str | None) -> bool:
    """Return True only for authoritative English records."""
    if not lang_code:
        return False
    code = lang_code.strip().lower()
    if code != PRIMARY_LANGUAGE:
        return False
    return code not in EXCLUDED_LANGUAGE_CODES


def is_target_translation(code: str | None) -> bool:
    """Return True for Polish translations (including standard variations)."""
    if not code:
        return False
    return code.strip().lower() in {
        TARGET_LANGUAGE,
        "pol",
        "pl-pl",
        "polish",
    }


def language_name(code: str | None) -> str:
    """Return a canonical English name for well-known codes."""
    names = {
        "en": "English",
        "pl": "Polish",
        "de": "German",
        "fr": "French",
        "es": "Spanish",
        "it": "Italian",
        "ru": "Russian",
        "zh": "Chinese",
    }
    if not code:
        return ""
    return names.get(code.strip().lower(), code)
