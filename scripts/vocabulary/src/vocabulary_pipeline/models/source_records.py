"""Canonical source-record models produced by the extraction stage.

These dataclasses are the *source-oriented* intermediate representation. They
retain provenance identifiers so the later canonicalisation and reconciliation
stages can attribute every merged value.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class SourceRecord:
    """Generic envelope for any extracted source record."""

    source: str
    source_version: str
    source_record_id: str
    record: dict[str, Any] = field(default_factory=dict)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WordnetSenseRef:
    """A WordNet sense: lemma + POS + sense id + synset reference."""

    lemma: str
    pos: str
    sense_id: str
    synset: str


@dataclass
class WordnetEntryRecord:
    """One WordNet entry (lemma, POS) with its sense references."""

    lemma: str
    pos: str
    senses: list[WordnetSenseRef] = field(default_factory=list)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WordnetSynsetRecord:
    """One WordNet synset with definition, members and relationship ids."""

    synset_id: str
    pos: str
    definition: str
    members: list[str]
    ili: str | None = None
    wikidata: str | None = None
    examples: list[str] = field(default_factory=list)
    relations: dict[str, list[str]] = field(default_factory=dict)

    def to_line(self) -> dict[str, Any]:
        return asdict(self)
