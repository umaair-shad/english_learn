from __future__ import annotations

from vocabulary_pipeline.matching import (
    content_tokens,
    gloss_affinity,
    string_similarity,
    token_bigram_similarity,
)
from vocabulary_pipeline.matching.cefr import match_notes_to_sense
from vocabulary_pipeline.matching.translations import classify, match_translation_to_senses
from vocabulary_pipeline.matching.wordnet import match_sense_to_synsets


def test_content_tokens_removes_stopwords():
    tokens = content_tokens("An edge of river, lake, or other watercourse.")
    assert tokens == ["edge", "river", "lake", "watercourse"]


def test_token_bigram_similarity_identical():
    assert token_bigram_similarity("bank", "bank") == 1.0


def test_token_bigram_similarity_unrelated_is_low():
    assert token_bigram_similarity("a dog barks", "the cat sleeps") < 0.3


def test_translation_label_matches_gloss():
    idx, score, confidence = match_translation_to_senses(
        "edge of river or lake",
        [{"glosses": ["An edge of river, lake, or other watercourse."]}],
    )
    assert idx == 0
    assert score >= 0.6
    assert confidence == "HIGH"


def test_translation_label_branch_office():
    idx, score, confidence = match_translation_to_senses(
        "branch office",
        [{"glosses": ["A branch office of such an institution."]}],
    )
    assert idx == 0
    assert confidence in {"HIGH", "MEDIUM"}


def test_translation_label_unmatched_when_no_similarity():
    idx, score, confidence = match_translation_to_senses(
        "zyxwv nonsense",
        [{"glosses": ["An institution where one can place money."]}],
    )
    assert idx is None
    assert confidence == "UNMATCHED"


def test_classify_confidence_bands():
    assert classify(0.9) == "HIGH"
    assert classify(0.5) == "MEDIUM"
    assert classify(0.2) == "LOW"
    assert classify(0.0) == "UNMATCHED"


def test_cefr_notes_lift():
    idx, confidence = match_notes_to_sense(
        "a financial institution that takes deposits",
        [{"definition": "An institution where one can place and borrow money."}],
    )
    assert confidence in {"EXACT", "HIGH", "MEDIUM"}


def test_wordnet_best_synset_winning_by_margin():
    candidates = [
        {"synset_id": "08437235-n",
         "definition": "a financial institution that accepts deposits and channels money into lending"},
        {"synset_id": "09236472-n",
         "definition": "sloping land (especially the slope beside a body of water)"},
    ]
    synset_id, score, confidence = match_sense_to_synsets(
        "An institution where one can place and borrow money and take care of financial affairs.",
        candidates,
        min_score=0.2,
    )
    assert synset_id == "08437235-n"
    assert score > 0.2
    assert confidence in {"HIGH", "MEDIUM", "LOW"}


def test_wordnet_river_sense_does_not_match_financial():
    candidates = [
        {"synset_id": "08437235-n",
         "definition": "a financial institution that accepts deposits and channels money into lending"},
    ]
    synset_id, score, confidence = match_sense_to_synsets(
        "An edge of river, lake, or other watercourse.",
        candidates,
        min_score=0.2,
    )
    # no lexical overlap with the financial candidate -> must not be guessed
    assert synset_id is None


def test_gloss_affinity_is_content_aware():
    high = gloss_affinity("An edge of river, lake, or other watercourse.",
                          "the edge of a river or lake")
    low = gloss_affinity("An edge of river, lake, or other watercourse.",
                         "a financial institution that takes deposits")
    assert high > 2 * low + 0.1


def test_string_similarity_fallback():
    assert string_similarity("light relief", "light relief") > 0.9
