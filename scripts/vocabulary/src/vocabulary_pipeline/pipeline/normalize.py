"""Stage: normalize — turn source records into canonical vocabulary objects.

Wiktextract English records become canonical entries + senses. Duplicate
*identical* senses (same entry + normalized definition + tags) are collapsed;
the source keeping the first occurrence wins and duplicates are reported.
CEFR/Octanove/NGSL/WordNet records are lightly normalised to canonical form.
"""

from __future__ import annotations

import json

from ..logging import LOG, ProgressReporter
from ..normalization.lemma import normalize_lemma
from ..normalization.pos import canonicalize_pos
from ..normalization.text import lookup_normalize, simple_normalize
from .io import Manifest, iter_jsonl, jsonl_writer


def sense_dedup_key(entry_key: str, definition: str, tags: list[str]) -> str:
    """Identity for deciding whether two senses are the same item.

    lemma/POS (entry_key) + definition + tags. Never the lemma alone.
    """
    tags_key = "|".join(sorted(tags))
    return f"{entry_key}||{tags_key}||{definition}"


def _normalize_wiktextract(extracted_path, entries_w, senses_w, trans_w, examples_w):
    entries: dict[str, dict] = {}
    ordinals: dict[str, int] = {}
    seen: dict[str, str] = {}  # durty -> ordinal
    written_entries: set[str] = set()
    reporter = ProgressReporter("normalize wiktextract", 250_000)
    duplicates = 0

    with open(extracted_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            reporter.tick()
            lemma = record.get("word", "")
            pos = record.get("canonical_pos") or canonicalize_pos(record.get("pos"))
            nlemma = normalize_lemma(lemma)
            if not nlemma:
                continue
            entry_key = f"{nlemma}|{pos}"

            entry = entries.get(entry_key)
            if entry is None:
                entry = {
                    "entry_key": entry_key,
                    "lemma": lemma,
                    "normalized_lemma": nlemma,
                    "part_of_speech": pos,
                    "language": "en",
                    "display_form": lemma,
                    "source_record_ids": [],
                    "wikidata_qid": "",
                }
                entries[entry_key] = entry
            sid = record.get("source_record_id", "")
            if sid and sid not in entry["source_record_ids"]:
                entry["source_record_ids"].append(sid)

            if entry_key not in written_entries:
                entries_w.write(entry)
                written_entries.add(entry_key)

            for i, sense in enumerate(record.get("senses") or []):
                glosses = sense.get("glosses") or []
                definition = simple_normalize(glosses[0]) if glosses else ""
                if not definition:
                    continue
                ndef = lookup_normalize(definition)
                tags = sorted(str(t) for t in (sense.get("tags") or []))
                durty = sense_dedup_key(entry_key, ndef, tags)
                ordinal = seen.get(durty)
                if ordinal is None:
                    ordinal = ordinals.get(entry_key, 0)
                    ordinals[entry_key] = ordinal + 1
                    seen[durty] = ordinal
                    sense_record = {
                        "entry_key": entry_key,
                        "lemma": lemma,
                        "normalized_lemma": nlemma,
                        "part_of_speech": pos,
                        "source_position_ordinal": ordinal,
                        "definition": definition,
                        "normalized_definition": ndef,
                        "raw_definition": simple_normalize(
                            (sense.get("raw_glosses") or [""])[0]
                        ),
                        "tags": tags,
                        "source_record_id": sid,
                        "sense_id_hint": sense.get("senseid", ""),
                        "wikidata_qid": (sense.get("wikidata") or ""),
                    }
                    senses_w.write(sense_record)
                else:
                    duplicates += 1
                for ex in sense.get("examples") or []:
                    if ex.get("text"):
                        examples_w.write(
                            {
                                "entry_key": entry_key,
                                "source_position_ordinal": ordinal,
                                "text": simple_normalize(ex.get("text", "")),
                                "source_record_id": sid,
                                "ref": ex.get("ref", ""),
                                "example_type": ex.get("type", "example"),
                            }
                        )

            for tr in record.get("translations") or []:
                word = simple_normalize(tr.get("word", ""))
                if not word:
                    continue
                trans_w.write(
                    {
                        "entry_key": entry_key,
                        "source_record_id": sid,
                        "sense_label": simple_normalize(tr.get("sense", "")),
                        "text": word,
                        "normalized_text": lookup_normalize(word),
                        "tags": [str(t) for t in (tr.get("tags") or [])],
                    }
                )

    reporter.summary()
    LOG.info("normalize: sense duplicates collapsed (incl. cross-record)=%s", duplicates)
    return {"entries": len(entries), "duplicates": duplicates}


def run(manifest: Manifest, cfg) -> dict:
    if manifest.is_complete("normalize"):
        LOG.info("[normalize] already complete, skipping")
        return manifest.data["normalize"]["summary"]

    manifest.mark_running("normalize")
    out_dir = cfg.staging_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    summary: dict = {}

    with (
        jsonl_writer(out_dir / "canonical_entries.jsonl") as entries_w,
        jsonl_writer(out_dir / "canonical_senses.jsonl") as senses_w,
        jsonl_writer(out_dir / "canonical_translations.jsonl") as trans_w,
        jsonl_writer(out_dir / "canonical_examples.jsonl") as examples_w,
    ):
        wt_path = manifest.stage_path("extract", "wiktextract")
        summary["wiktextract"] = _normalize_wiktextract(
            wt_path, entries_w, senses_w, trans_w, examples_w
        )

    # pass-through the already canonical source records
    _passthrough(manifest.stage_path("extract", "cefr_j"), out_dir / "canonical_cefr.jsonl")
    _passthrough(manifest.stage_path("extract", "octanove"), out_dir / "canonical_cefr.jsonl")
    _passthrough(manifest.stage_path("extract", "ngsl"), out_dir / "canonical_frequency.jsonl")
    _passthrough(manifest.stage_path("extract", "wordnet_synsets"), out_dir / "canonical_wordnet_synsets.jsonl")
    _passthrough(manifest.stage_path("extract", "wordnet_entries"), out_dir / "canonical_wordnet_entries.jsonl")

    for name in ("canonical_cefr", "canonical_frequency", "canonical_wordnet_synsets", "canonical_wordnet_entries"):
        p = out_dir / f"{name}.jsonl"
        summary[name] = {"rows": sum(1 for _ in iter_jsonl(p))}

    manifest.record_output("normalize", summary, out_dir)
    return summary


def _passthrough(src: object, dest) -> None:
    """Concatenate source file lines into dest (idempotent append)."""
    from pathlib import Path

    src_path = src if isinstance(src, Path) else Path(src)
    if not src_path.exists():
        LOG.warning("passthrough: missing %s", src_path)
        return
    with src_path.open("r", encoding="utf-8") as fh, dest.open("a", encoding="utf-8", newline="\n") as out:
        for line in fh:
            if line.strip():
                out.write(line)
