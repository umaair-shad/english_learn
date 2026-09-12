from __future__ import annotations

from vocabulary_pipeline.normalization.language import (
    is_primary_language,
    is_target_translation,
)
from vocabulary_pipeline.normalization.lemma import normalize_lemma, split_variant_forms
from vocabulary_pipeline.normalization.pos import (
    WORDNET_POS,
    canonicalize_pos,
    wordnet_pos_to_canonical,
)
from vocabulary_pipeline.normalization.text import (
    collapse_whitespace,
    lookup_normalize,
    normalize_unicode,
    simple_normalize,
)


def test_unicode_normalization_nfkc():
    assert normalize_unicode("ﬁne") == "fine"  # ligature


def test_collapse_whitespace():
    assert collapse_whitespace("  a\t b\n c  ") == "a b c"


def test_simple_normalize_preserves_case():
    assert simple_normalize("<b>  Bank</b> run ") == "Bank run"


def test_lookup_normalize_strips_diacritics_for_keys():
    assert lookup_normalize("Café Résumé") == "cafe resume"


def test_lookup_normalize_lowercases_and_flattens_punct():
    assert lookup_normalize("  A.T.M. (machine) ") == "a t m machine"


def test_normalize_lemma_key():
    assert normalize_lemma("  Bank, ") == "bank"
    assert normalize_lemma("TRAIN-station") == "train-station"  # keeps meaningful hyphen


def test_variant_forms_split():
    forms = split_variant_forms("a.m./A.M./am/AM")
    assert "a.m." in forms
    assert "A.M." in forms


def test_pos_canonicalization():
    assert canonicalize_pos("noun") == "noun"
    assert canonicalize_pos("n") == "noun"
    assert canonicalize_pos("adj") == "adjective"
    assert canonicalize_pos("adj satellite") == "adjective"
    assert canonicalize_pos(None) == "unknown"
    # unknown labels are preserved not dropped, so QC can review them
    assert canonicalize_pos("vernac") == "vernac"


def test_pos_canonicalization_phrase_and_affix_labels():
    # full-data exposure: wiktextract emits these frequently; they must map to
    # the canonical set instead of leaking as invalid_pos
    assert canonicalize_pos("prep phrase") == "prepositional phrase"
    assert canonicalize_pos("prep_phrase") == "prepositional phrase"
    assert canonicalize_pos("prepphrase") == "prepositional phrase"
    assert canonicalize_pos("interfix") == "affix"
    assert canonicalize_pos("circumfix") == "affix"
    assert canonicalize_pos("adv phrase") == "phrase"
    assert canonicalize_pos("adj phrase") == "phrase"
    assert canonicalize_pos("noun phrase") == "phrase"
    assert canonicalize_pos("verb phrase") == "phrase"


def test_wordnet_pos_mapping_roundtrip():
    assert WORDNET_POS["n"] == "noun"
    assert WORDNET_POS["v"] == "verb"
    assert wordnet_pos_to_canonical("a") == "adjective"
    assert wordnet_pos_to_canonical("r") == "adverb"


def test_primary_language_filtering():
    assert is_primary_language("en")
    assert is_primary_language("EN")
    assert not is_primary_language("enm")
    assert not is_primary_language("sco")
    assert not is_primary_language("fr")
    assert not is_primary_language(None)


def test_target_translation_detection():
    assert is_target_translation("pl")
    assert is_target_translation("pol")
    assert is_target_translation("Polish")
    assert not is_target_translation("de")
    assert not is_target_translation(None)
