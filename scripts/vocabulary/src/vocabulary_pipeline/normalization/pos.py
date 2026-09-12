"""Part-of-speech canonicalisation.

Maps the differing POS vocabularies of Wiktextract, CEFR-J, Octanove and
WordNet onto a single canonical set.
"""

from __future__ import annotations

CANONICAL_POS = {
    "noun": "noun",
    "n": "noun",
    "name": "noun",
    "proper noun": "noun",
    "proper noun pl": "noun",
    "proverb": "proverb",
    "verb": "verb",
    "v": "verb",
    "adj": "adjective",
    "adj satellite": "adjective",
    "a": "adjective",
    "s": "adjective",
    "adjective": "adjective",
    "adv": "adverb",
    "r": "adverb",
    "adverb": "adverb",
    "pron": "pronoun",
    "pronoun": "pronoun",
    "det": "determiner",
    "determiner": "determiner",
    "prep": "preposition",
    "preposition": "preposition",
    "prep_phrase": "prepositional phrase",
    "prepphrase": "prepositional phrase",
    "conj": "conjunction",
    "conjunction": "conjunction",
    "intj": "interjection",
    "interjection": "interjection",
    "num": "numeral",
    "numeral": "numeral",
    "part": "particle",
    "particle": "particle",
    "phrase": "phrase",
    "phr": "phrase",
    "symbol": "symbol",
    "letter": "letter",
    "character": "character",
    "prefix": "prefix",
    "suffix": "suffix",
    "infix": "infix",
    "interfix": "affix",
    "circumfix": "affix",
    "contraction": "contraction",
    "article": "article",
    "punct": "punctuation",
    "postp": "postposition",
"clitic": "clitic",
    "idiom": "idiom",
    "romanization": "romanization",
    "pinyin": "romanization",
    "hanzi": "character",
    "combining form": "affix",
"affix": "affix",
    "circumposition": "postposition",
    "abbreviation": "abbreviation",
    "initialism": "abbreviation",
    "acronym": "abbreviation",
    "adv phrase": "phrase",
    "adj phrase": "phrase",
    "noun phrase": "phrase",
    "verb phrase": "phrase",
}

# WordNet wpos -> canonical POS
WORDNET_POS = {
    "n": "noun",
    "v": "verb",
    "a": "adjective",
    "s": "adjective",
    "r": "adverb",
}

# Canonical POS -> WordNet wpos (for matching WordNet)
CANONICAL_TO_WORDNET = {
    "noun": "n",
    "verb": "v",
    "adjective": "a",
    "adverb": "r",
}


def canonicalize_pos(raw: str | None) -> str:
    """Return the canonical POS for a raw source POS label.

    Unknown labels are returned lowercased and space-normalized rather than
    silently dropped so the QC layer can flag them.
    """
    if not raw:
        return "unknown"
    key = " ".join(raw.strip().lower().replace("_", " ").split())
    mapped = CANONICAL_POS.get(key) or CANONICAL_POS.get(key.replace(" ", "_"))
    if mapped:
        return mapped
    return key


def wordnet_pos_to_canonical(raw: str) -> str:
    """Map a WordNet POS code to the canonical POS name."""
    return WORDNET_POS.get(raw, canonicalize_pos(raw))
