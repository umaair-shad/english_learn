"""Canonical, sense-based vocabulary model.

These are the canonical objects the pipeline builds. They map directly onto
the production PostgreSQL schema. A *sense* is the atom students will later
learn against — never collapse multiple senses into one record.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

# Confidence values used across matching and reconciliation.
CONFIDENCE_EXACT = "EXACT"
CONFIDENCE_HIGH = "HIGH"
CONFIDENCE_MEDIUM = "MEDIUM"
CONFIDENCE_LOW = "LOW"
CONFIDENCE_UNMATCHED = "UNMATCHED"

CONFIDENCE_ORDER = {
    CONFIDENCE_EXACT: 4,
    CONFIDENCE_HIGH: 3,
    CONFIDENCE_MEDIUM: 2,
    CONFIDENCE_LOW: 1,
    CONFIDENCE_UNMATCHED: 0,
}


@dataclass
class CanonicalEntry:
    """A lexical entry: (normalized lemma, canonical POS)."""

    lemma: str
    normalized_lemma: str
    part_of_speech: str
    language: str = "en"
    display_form: str = ""
    source_record_ids: list[str] = field(default_factory=list)
    wikidata_qid: str = ""

    @property
    def key(self) -> tuple[str, str]:
        return (self.normalized_lemma, self.part_of_speech)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CanonicalSense:
    """One meaning. Owns a definition and its Polish translations."""

    entry_key: tuple[str, str]
    lemma: str
    normalized_lemma: str
    part_of_speech: str
    position: int
    definition: str
    normalized_definition: str
    raw_definition: str = ""
    tags: list[str] = field(default_factory=list)
    source_record_id: str = ""
    sense_id_hint: str = ""
    wikidata_qid: str = ""

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class CanonicalTranslation:
    """A translation belonging to one exact sense."""

    entry_key: tuple[str, str]
    sense_position: int
    language: str = "pl"
    text: str = ""
    normalized_text: str = ""
    sense_label: str = ""
    source_record_id: str = ""
    match_method: str = ""
    confidence: str = CONFIDENCE_UNMATCHED

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class CanonicalExample:
    """An example sentence attached to one sense."""

    entry_key: tuple[str, str]
    sense_position: int
    text: str
    source_record_id: str = ""
    ref: str = ""
    example_type: str = ""

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class CanonicalCefr:
    """A CEFR assignment. Sources are explicitly recorded."""

    entry_key: tuple[str, str]
    lemma: str
    level: str
    source: str
    source_version: str = ""
    source_record_id: str = ""
    match_method: str = "lemma+pos"
    confidence: str = CONFIDENCE_MEDIUM
    requires_review: bool = False
    notes: str = ""

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class CanonicalFrequency:
    """Lemma-level frequency information."""

    entry_key: tuple[str, str]
    lemma: str
    rank: int
    sfi: float
    frequency_per_million: float
    source: str = "ngsl"
    source_version: str = "1.2"
    source_record_id: str = ""

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class WordnetSynsetCanonical:
    """A canonical WordNet synset for the semantic layer."""

    synset_id: str
    part_of_speech: str
    definition: str
    members: list[str] = field(default_factory=list)
    ili: str | None = None
    wikidata_qid: str | None = None
    examples: list[str] = field(default_factory=list)
    relations: dict[str, list[str]] = field(default_factory=dict)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SenseSynsetMatch:
    """A Wiktextract sense matched to a WordNet synset."""

    entry_key: tuple[str, str]
    sense_position: int
    synset_id: str
    match_method: str = "gloss_similarity"
    confidence: str = CONFIDENCE_LOW

    def to_line(self) -> dict[str, Any]:
        line = asdict(self)
        line["entry_key"] = f"{self.entry_key[0]}|{self.entry_key[1]}"
        return line


@dataclass
class ProvenanceRecord:
    """One provenance trail entry for a merged field."""

    entity_type: str
    entity_key: str
    field_name: str
    source: str
    source_version: str
    source_record_id: str
    match_method: str = ""
    confidence: str = CONFIDENCE_UNMATCHED

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class QualityIssue:
    """One QC issue found during validation."""

    entity_type: str
    entity_key: str
    issue_code: str
    severity: str  # error | warning | info
    message: str = ""
    payload: dict[str, Any] = field(default_factory=dict)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ConflictRecord:
    """Recorded disagreement between sources or within one source."""

    field_name: str
    entity_key: str
    sources: list[str]
    values: list[str]
    resolution: str
    requires_review: bool = True

    def to_line(self) -> dict[str, Any]:
        return asdict(self)
