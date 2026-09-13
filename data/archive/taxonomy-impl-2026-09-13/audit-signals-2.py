"""More read-only coverage: WordNet domains + raw en: categories."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

WN_SYN = Path(r"E:\fiver\project_english\data\staging\extract_wordnet_synsets.jsonl")
REL = Path(r"E:\fiver\project_english\data\processed\semantic_relationships.jsonl")
SENSE_SYN = Path(r"E:\fiver\project_english\data\processed\sense_synsets.jsonl")
RAW = Path(r"E:\fiver\Project English Learn\project\raw-wiktextract-data.jsonl\raw-wiktextract-data.jsonl")


def load_synsets() -> dict[str, dict]:
    out = {}
    with WN_SYN.open("r", encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            out[rec["synset_id"]] = rec
    return out


def main() -> None:
    synsets = load_synsets()
    domain_targets: set[str] = set()
    with REL.open("r", encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            if rec.get("relationship_type") == "domain_topic":
                domain_targets.add(rec["target_synset_id"])
    members: Counter[str] = Counter()
    for sid in domain_targets:
        rec = synsets.get(sid) or {}
        for m in rec.get("members") or []:
            members[str(m).lower()] += 1
    print("=== UNIQUE DOMAIN TARGET SYNSETS ===")
    print(len(domain_targets))
    print("=== TOP DOMAIN MEMBERS ===")
    print(json.dumps(members.most_common(50), indent=2))

    domain_sources = {
        rec["source_synset_id"]
        for rec in (json.loads(line) for line in REL.open("r", encoding="utf-8"))
        if rec.get("relationship_type") == "domain_topic"
    }
    matched = 0
    matched_with_domain = 0
    with SENSE_SYN.open("r", encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            matched += 1
            if rec.get("synset_id") in domain_sources:
                matched_with_domain += 1
    print("=== FULL PROCESSED SENSE-SYNSET DOMAIN COVERAGE ===")
    print(json.dumps({"sense_synsets": matched, "with_domain_topic": matched_with_domain}, indent=2))

    en_cats: Counter[str] = Counter()
    topics: Counter[str] = Counter()
    english = 0
    senses = 0
    topical_senses = 0
    examples = []
    wanted = {"bank", "cook", "river", "atom", "election", "volunteer", "boil", "music", "law"}
    with RAW.open("r", encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            if i > 250_000 and english >= 2000:
                break
            if '"lang_code": "en"' not in line:
                continue
            rec = json.loads(line)
            if rec.get("lang_code") != "en":
                continue
            english += 1
            word = str(rec.get("word") or "").lower()
            for sense in rec.get("senses") or []:
                senses += 1
                st = sense.get("topics") or []
                sc = [str(c) for c in (sense.get("categories") or [])]
                if st:
                    topics.update(str(t) for t in st)
                topical = [c for c in sc if c.startswith("en:")]
                if topical:
                    topical_senses += 1
                    en_cats.update(topical)
                if word in wanted and (st or topical) and len(examples) < 20:
                    examples.append(
                        {
                            "word": rec.get("word"),
                            "pos": rec.get("pos"),
                            "gloss": (sense.get("glosses") or [""])[0][:160],
                            "topics": st,
                            "en_categories": topical[:8],
                        }
                    )
            if english >= 12000:
                break
    print("=== RAW EN: CATEGORIES / TOPICS ===")
    print(
        json.dumps(
            {
                "english_records": english,
                "senses": senses,
                "senses_with_en_prefix_category": topical_senses,
                "distinct_en_categories": len(en_cats),
                "distinct_topics": len(topics),
                "top_en_categories": en_cats.most_common(40),
                "examples": examples,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
