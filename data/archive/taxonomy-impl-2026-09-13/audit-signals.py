"""Read-only audit of topic signals in existing artifacts. No DB writes."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

EXTRACT = Path(r"E:\fiver\project_english\data\staging\extract_wiktextract.jsonl")
PROC_SENSES = Path(r"E:\fiver\project_english\data\processed\canonical_senses.jsonl")
STAGING_SENSES = Path(r"E:\fiver\project_english\data\staging\canonical_senses.jsonl")
WN_SYN = Path(r"E:\fiver\project_english\data\staging\extract_wordnet_synsets.jsonl")
REL = Path(r"E:\fiver\project_english\data\processed\semantic_relationships.jsonl")
SENSE_SYN = Path(r"E:\fiver\project_english\data\processed\sense_synsets.jsonl")
RAW = Path(r"E:\fiver\Project English Learn\project\raw-wiktextract-data.jsonl\raw-wiktextract-data.jsonl")


def peek_keys(path: Path, n: int = 3) -> list[dict]:
    out = []
    with path.open("r", encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if i >= n:
                break
            if line.strip():
                obj = json.loads(line)
                out.append({"keys": sorted(obj.keys()), "sample": obj})
    return out


def audit_extract(path: Path) -> dict:
    records = 0
    senses = 0
    with_topics = 0
    with_cats = 0
    with_raw_tags = 0
    with_tags = 0
    tag_counter: Counter[str] = Counter()
    record_keys: Counter[str] = Counter()
    sense_keys: Counter[str] = Counter()
    examples = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            records += 1
            record_keys.update(rec.keys())
            for sense in rec.get("senses") or []:
                senses += 1
                sense_keys.update(sense.keys())
                if sense.get("topics"):
                    with_topics += 1
                if sense.get("categories"):
                    with_cats += 1
                if sense.get("raw_tags"):
                    with_raw_tags += 1
                tags = sense.get("tags") or []
                if tags:
                    with_tags += 1
                    tag_counter.update(str(t) for t in tags)
            if rec.get("categories"):
                with_cats += 1
            if len(examples) < 5:
                examples.append(
                    {
                        "word": rec.get("word"),
                        "pos": rec.get("pos"),
                        "sense_keys": sorted((rec.get("senses") or [{}])[0].keys())
                        if rec.get("senses")
                        else [],
                        "first_tags": (rec.get("senses") or [{}])[0].get("tags"),
                        "first_gloss": ((rec.get("senses") or [{}])[0].get("glosses") or [None])[0],
                    }
                )
    return {
        "records": records,
        "senses": senses,
        "senses_with_topics": with_topics,
        "senses_with_categories": with_cats,
        "senses_with_raw_tags": with_raw_tags,
        "senses_with_tags": with_tags,
        "record_keys": dict(record_keys),
        "sense_keys": dict(sense_keys),
        "top_tags": tag_counter.most_common(40),
        "examples": examples,
    }


def audit_wordnet_synsets(path: Path) -> dict:
    total = 0
    with_domain = 0
    with_hyper = 0
    with_hypo = 0
    rel_counts: Counter[str] = Counter()
    domain_members: Counter[str] = Counter()
    domain_defs = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            total += 1
            rels = rec.get("relations") or {}
            rel_counts.update(rels.keys())
            if rels.get("domain_topic"):
                with_domain += 1
            if rels.get("hypernym"):
                with_hyper += 1
            if rels.get("hyponym") or rels.get("instance_hyponym"):
                with_hypo += 1
    # second pass not needed; collect members via target lookup later
    return {
        "synsets": total,
        "with_domain_topic": with_domain,
        "with_hypernym": with_hyper,
        "with_hyponym_or_instance": with_hypo,
        "relation_key_counts": dict(rel_counts),
        "domain_members_placeholder": domain_members.most_common(5),
        "domain_def_samples": domain_defs,
    }


def audit_rels(path: Path) -> dict:
    types: Counter[str] = Counter()
    total = 0
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            total += 1
            types[rec.get("relationship_type") or ""] += 1
    return {"total": total, "by_type": dict(types.most_common())}


def audit_sense_synsets(path: Path) -> dict:
    total = 0
    conf: Counter[str] = Counter()
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            total += 1
            conf[str(rec.get("confidence"))] += 1
    return {"total": total, "by_confidence": dict(conf)}


def audit_raw_sample(path: Path, max_english: int = 5000, max_lines: int = 250_000) -> dict:
    english = 0
    scanned = 0
    topic_senses = 0
    cat_senses = 0
    raw_tag_senses = 0
    tag_senses = 0
    total_senses = 0
    topics: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    raw_tags: Counter[str] = Counter()
    tags: Counter[str] = Counter()
    record_cats: Counter[str] = Counter()
    sense_key_union: Counter[str] = Counter()
    examples = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            scanned += 1
            if scanned >= max_lines and english >= 200:
                break
            if '"lang_code": "en"' not in line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("lang_code") != "en":
                continue
            english += 1
            for cat in rec.get("categories") or []:
                record_cats[str(cat)] += 1
            for sense in rec.get("senses") or []:
                total_senses += 1
                sense_key_union.update(sense.keys())
                st = sense.get("topics") or []
                sc = sense.get("categories") or []
                sr = sense.get("raw_tags") or []
                sg = sense.get("tags") or []
                if st:
                    topic_senses += 1
                    topics.update(str(t) for t in st)
                if sc:
                    cat_senses += 1
                    categories.update(str(t) for t in sc)
                if sr:
                    raw_tag_senses += 1
                    raw_tags.update(str(t) for t in sr)
                if sg:
                    tag_senses += 1
                    tags.update(str(t) for t in sg)
                if st and len(examples) < 12:
                    examples.append(
                        {
                            "word": rec.get("word"),
                            "pos": rec.get("pos"),
                            "gloss": (sense.get("glosses") or [""])[0][:140],
                            "topics": st,
                            "categories": sc[:8],
                            "tags": sg[:8],
                            "raw_tags": sr[:8],
                        }
                    )
            if english >= max_english:
                break
    return {
        "lines_scanned": scanned,
        "english_records": english,
        "english_senses": total_senses,
        "senses_with_topics": topic_senses,
        "senses_with_categories": cat_senses,
        "senses_with_raw_tags": raw_tag_senses,
        "senses_with_tags": tag_senses,
        "distinct_topics": len(topics),
        "distinct_sense_categories": len(categories),
        "distinct_record_categories": len(record_cats),
        "distinct_raw_tags": len(raw_tags),
        "top_topics": topics.most_common(40),
        "top_sense_categories": categories.most_common(40),
        "top_record_categories": record_cats.most_common(40),
        "top_raw_tags": raw_tags.most_common(25),
        "top_tags": tags.most_common(25),
        "sense_keys": dict(sense_key_union),
        "examples": examples,
    }


def main() -> None:
    print("=== EXTRACT FIRST RECORD KEYS ===")
    extract_peek = peek_keys(EXTRACT, 1)
    print(json.dumps(extract_peek[0]["keys"], indent=2))
    print("sense keys", sorted((extract_peek[0]["sample"].get("senses") or [{}])[0].keys()))

    print("=== PROCESSED SENSE KEYS ===")
    proc_peek = peek_keys(PROC_SENSES, 1)
    print(json.dumps(proc_peek[0]["keys"], indent=2))

    print("=== STAGING SENSE KEYS ===")
    st_peek = peek_keys(STAGING_SENSES, 1)
    print(json.dumps(st_peek[0]["keys"], indent=2))

    print("=== EXTRACT FULL SCAN ===")
    extract_stats = audit_extract(EXTRACT)
    slim = dict(extract_stats)
    slim.pop("examples", None)
    print(json.dumps(slim, indent=2))
    print("extract examples", json.dumps(extract_stats["examples"], indent=2))

    print("=== WORDNET SYNSETS ===")
    print(json.dumps(audit_wordnet_synsets(WN_SYN), indent=2))

    print("=== PROCESSED RELS ===")
    print(json.dumps(audit_rels(REL), indent=2))

    print("=== PROCESSED SENSE_SYNSETS ===")
    print(json.dumps(audit_sense_synsets(SENSE_SYN), indent=2))

    print("=== RAW SAMPLE ===")
    print(json.dumps(audit_raw_sample(RAW, max_english=8000), indent=2))


if __name__ == "__main__":
    main()
