"""Open English WordNet 2025 loader.

The distribution is split across ~73 JSON files. Each file is loaded one at a
time (bounded memory) and streamed into two canonical JSONL staging files:

* ``wordnet_entries.jsonl`` — lemma → POS → [sense id + synset ref]
* ``wordnet_synsets.jsonl``  — synset id → definition, members, relations

Relations are normalised at the synset level (hypernym, mero_*, similar,
also, attribute, entails, causes, domain_*, exemplifies, source).
"""

from __future__ import annotations

import glob
import json
import re
from pathlib import Path

from ..logging import LOG
from ..normalization.lemma import normalize_lemma
from ..normalization.pos import wordnet_pos_to_canonical

SOURCE = "wordnet"
SOURCE_VERSION = "english-wordnet-2025"

RELATION_KEYS = {
    "hypernym",
    "mero_part",
    "mero_member",
    "mero_substance",
    "similar",
    "also",
    "attribute",
    "entails",
    "causes",
    "domain_topic",
    "domain_region",
    "exemplifies",
    "source",
    "verb_group",
    "instance_hypernym",
    "instance_hyponym",
}

SENSE_ID_RE = re.compile(r"^(.*)%(\\d):(\\d+):(\\d+)::$")


def normalize_synset_id(raw: str) -> str:
    return raw.strip()


def iter_synset_files(dir_path: Path):
    for pattern in ("noun.*.json", "verb.*.json", "adj.*.json", "adv.*.json"):
        for file_path in sorted(glob.glob(str(dir_path / pattern))):
            yield file_path


def iter_entry_files(dir_path: Path):
    for file_path in sorted(glob.glob(str(dir_path / "entries-*.json"))):
        yield file_path


def parse_synset_file(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize_synset(synset_id: str, raw: dict) -> dict:
    pos = wordnet_pos_to_canonical(raw.get("partOfSpeech") or _pos_from_synset_id(synset_id))
    definition_arr = raw.get("definition") or []
    relations: dict[str, list[str]] = {}
    for key in RELATION_KEYS:
        values = raw.get(key)
        if isinstance(values, list):
            cleaned = [normalize_synset_id(str(v)) for v in values if v]
            if cleaned:
                relations[key] = cleaned
    examples = [str(e) for e in raw.get("example") or [] if e]
    wiki = raw.get("wikidata") or ""
    if isinstance(wiki, list):
        wiki = "|".join(str(q) for q in wiki if q)
    else:
        wiki = str(wiki)
    return {
        "synset_id": normalize_synset_id(synset_id),
        "pos": pos,
        "definition": str(definition_arr[0]) if definition_arr else "",
        "members": [str(m) for m in raw.get("members") or []],
        "ili": raw.get("ili") or "",
        "wikidata": wiki,
        "examples": examples,
        "relations": relations,
    }


def _pos_from_synset_id(synset_id: str) -> str:
    return synset_id.rsplit("-", 1)[-1]


def load(dir_path: Path, out_entries: Path, out_synsets: Path) -> dict:
    synset_count = 0
    entry_count = 0
    sense_count = 0

    with open(out_synsets, "w", encoding="utf-8", newline="\n") as syn_out:
        for file_path in iter_synset_files(dir_path):
            data = parse_synset_file(file_path)
            for synset_id, raw in data.items():
                record = normalize_synset(synset_id, raw)
                syn_out.write(json.dumps(record, ensure_ascii=False) + "\n")
                synset_count += 1
        LOG.info("wordnet synsets written: %s", synset_count)

    with open(out_entries, "w", encoding="utf-8", newline="\n") as ent_out:
        for file_path in iter_entry_files(dir_path):
            data = parse_synset_file(file_path)
            for lemma, pos_data in data.items():
                for pos_code, payload in pos_data.items():
                    canonical_pos = wordnet_pos_to_canonical(pos_code)
                    senses = payload.get("sense") or []
                    normalized_senses = []
                    for s in senses:
                        sid = str(s.get("id", ""))
                        synset = str(s.get("synset", ""))
                        if not sid or not synset:
                            continue
                        normalized_senses.append(
                            {
                                "sense_id": sid,
                                "synset": normalize_synset_id(synset),
                                "lemma": lemma,
                                "normalized_lemma": normalize_lemma(lemma),
                                "pos": canonical_pos,
                            }
                        )
                    if not normalized_senses:
                        continue
                    record = {
                        "lemma": lemma,
                        "normalized_lemma": normalize_lemma(lemma),
                        "pos": canonical_pos,
                        "pos_code": pos_code,
                        "senses": normalized_senses,
                    }
                    ent_out.write(json.dumps(record, ensure_ascii=False) + "\n")
                    entry_count += 1
                    sense_count += len(normalized_senses)
        LOG.info("wordnet entries written: %s senses: %s", entry_count, sense_count)

    return {"synsets": synset_count, "entries": entry_count, "senses": sense_count}
