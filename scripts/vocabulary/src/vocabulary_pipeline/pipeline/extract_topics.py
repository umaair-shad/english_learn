"""Thin sidecar: recover Wiktextract topics without a full extract rerun."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from ..config import Config
from ..logging import LOG, ProgressReporter
from ..normalization.pos import canonicalize_pos
from ..normalization.text import lookup_normalize
from ..sources.wiktextract import iter_records

TOPIC_DENY = {
    "heading",
}

CATEGORY_DENY_PREFIXES = (
    "english terms with ",
    "english entries with ",
    "pages with ",
    "terms with ",
    "quotation templates",
    "entries with translation",
    "english lemmas",
    "english nouns",
    "english verbs",
    "english adjectives",
    "english adverbs",
    "english transitive",
    "english intransitive",
    "english countable",
    "english uncountable",
    "english slang",
    "english informal",
    "english initials",
    "english initialisms",
    "english abbreviations",
    "english terms derived",
    "english terms inherited",
    "english terms borrowed",
    "american english",
    "british english",
)


def _norm_topic(raw: str) -> str:
    text = lookup_normalize(str(raw).replace("_", " ").replace("-", " "))
    return text.replace(" ", "-")[:128]


def _keep_topic(topic: str) -> bool:
    return bool(topic) and topic not in TOPIC_DENY and len(topic) >= 2


def _keep_category(name: str) -> bool:
    raw = str(name).strip()
    if raw.startswith("en:"):
        raw = raw[3:]
    else:
        return False
    lower = raw.lower()
    if any(lower.startswith(p) for p in CATEGORY_DENY_PREFIXES):
        return False
    if lower.startswith("places in ") or lower.startswith("towns in ") or lower.startswith(
        "cities in "
    ):
        return False
    return _keep_topic(_norm_topic(raw))


def extract_topics(cfg: Config, resume: bool = False) -> dict:
    raw_path = cfg.source_path("wiktextract")
    out_path = cfg.staging_dir / "extract_wiktextract_topics.jsonl"
    seen_ids: set[str] = set()
    if resume and out_path.exists():
        with out_path.open("r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    seen_ids.add(json.loads(line).get("source_record_id", ""))
                except json.JSONDecodeError:
                    continue
        LOG.info("topic sidecar resume: %s rows already written", f"{len(seen_ids):,}")

    reporter = ProgressReporter("wiktextract topics", 50_000)
    written = 0
    senses_with_topics = 0
    topic_counts: Counter[str] = Counter()
    mode = "a" if resume else "w"
    with out_path.open(mode, encoding="utf-8", newline="\n") as out:
        for record, line_number in iter_records(raw_path):
            reporter.tick()
            sid = f"line:{line_number}"
            if sid in seen_ids:
                continue
            pos = canonicalize_pos(record.get("pos", ""))
            word = str(record.get("word") or "")
            index = 0
            for sense in record.get("senses") or []:
                glosses = sense.get("glosses") or []
                if not glosses:
                    continue
                definition = str(glosses[0])
                topics = [
                    _norm_topic(t)
                    for t in (sense.get("topics") or [])
                    if _keep_topic(_norm_topic(t))
                ]
                cats = [
                    _norm_topic(c[3:] if str(c).startswith("en:") else c)
                    for c in (sense.get("categories") or [])
                    if _keep_category(str(c))
                ]
                if topics or cats:
                    senses_with_topics += 1
                    topic_counts.update(topics)
                    topic_counts.update(cats)
                    out.write(
                        json.dumps(
                            {
                                "source_record_id": sid,
                                "word": word,
                                "pos": pos,
                                "sense_index": index,
                                "normalized_definition": lookup_normalize(definition),
                                "topics": sorted(set(topics)),
                                "en_categories": sorted(set(cats)),
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                    written += 1
                index += 1

    summary = {
        "written": written,
        "senses_with_topics": senses_with_topics,
        "distinct_topics": len(topic_counts),
        "out_path": str(out_path),
    }
    LOG.info("topic sidecar complete: %s", summary)
    return summary
