"""Pipeline reporting: summary stats, CSV detail dumps, markdown summary.

Outputs (data/reports/):

* pipeline-summary.json / .md  — headline statistics
* invalid-records.csv          — quality issue flat dump
* cefr-conflicts.csv           — entries with competing CEFR claims
* unmatched-cefr.csv           — CEFR rows that matched no entry
* unmatched-wordnet.csv        — senses in entries that had candidates but fell below threshold
* duplicate-senses.csv         — senses flagged as duplicates
* missing-polish-translations.csv — senses without any Polish translation
* source-coverage.csv          — how many senses got data from each source
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path


def _rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)


def generate(cfg, validate_result: dict | None = None) -> dict:
    out = cfg.processed_dir
    reports = cfg.reports_dir
    reports.mkdir(parents=True, exist_ok=True)

    entries = _rows(out / "canonical_entries.jsonl")
    senses = _rows(out / "canonical_senses.jsonl")
    translations = _rows(out / "canonical_translations.jsonl")
    _rows(out / "canonical_examples.jsonl")
    cefr = _rows(out / "cefr_assignments.jsonl")
    freq = _rows(out / "frequency_data.jsonl")
    wn_matches = _rows(out / "sense_synsets.jsonl")
    conflicts = _rows(out / "conflicts.jsonl")
    rejected_senses = _rows(out / "rejected_senses.jsonl")
    rejected_trans = _rows(out / "rejected_translations.jsonl")

    # senses with polish translation
    trans_by_sense: dict[str, set] = defaultdict(set)
    for tr in translations:
        key = f"{tr['entry_key']}|{tr.get('sense_position')}"
        trans_by_sense[key].add(tr["text"])

    senses_with_pl = 0
    missing_pl_rows: list[list] = []
    for s in senses:
        key = f"{s['entry_key']}|{s['position']}"
        if trans_by_sense.get(key):
            senses_with_pl += 1
        else:
            missing_pl_rows.append([s["entry_key"], s["position"], s["definition"], s["lemma"]])

    cefr_by_sense: set[str] = {f"{c['entry_key']}|{c['sense_position']}" for c in cefr}
    senses_with_cefr = sum(1 for s in senses if f"{s['entry_key']}|{s['position']}" in cefr_by_sense)

    wn_by_sense: set[str] = {f"{m['entry_key']}|{m['sense_position']}" for m in wn_matches}
    senses_with_wn = sum(1 for s in senses if f"{s['entry_key']}|{s['position']}" in wn_by_sense)

    freq_entries = {f["entry_key"] for f in freq}

    # cefr conflicts
    cefr_conflict_rows = [
        [c["entity_key"], ",".join(c["sources"]), ",".join(c["values"]), c["resolution"]]
        for c in conflicts
    ]

    # unmatched CEFR rows (from extract sources vs entries)
    cefr_rows = _rows(cfg.staging_dir / "canonical_cefr.jsonl")
    matched_cefr_keys = {c["entry_key"] for c in cefr}
    unmatched_cefr = []
    for r in cefr_rows:
        key = f"{r['normalized_lemma']}|{r['canonical_pos']}"
        if key not in matched_cefr_keys:
            unmatched_cefr.append(
                [r.get("lemma", ""), r.get("canonical_pos", ""), r.get("level", ""), r.get("source", "")]
            )

    # unmatched wordnet: senses whose entry had WN candidates but no confident match
    wn_entries: dict[str, list] = defaultdict(list)
    for e in _rows(cfg.staging_dir / "canonical_wordnet_entries.jsonl"):
        wn_entries[f"{e['normalized_lemma']}|{e['pos']}"].append(e)
    wn_by_sense_lookup = defaultdict(list)
    for m in wn_matches:
        wn_by_sense_lookup[(m["entry_key"], m["sense_position"])].append(m)
    unmatched_wn = []
    for s in senses:
        key = s["entry_key"]
        if key not in wn_entries:
            continue
        if (key, s["position"]) not in wn_by_sense_lookup:
            unmatched_wn.append([key, s["position"], s["definition"].replace("\n", " ")[:200]])

    # duplicates
    dup_rows = []
    for i in _rows(out / "quality_issues.jsonl"):
        if i.get("issue_code") == "duplicate_sense":
            dup_rows.append([i.get("entity_key", ""), i.get("message", "")])

    # source coverage
    coverage = {
        "wiktextract_senses": len(senses),
        "translations_wiktextract": len(translations),
        "cefr_cefr_j": sum(1 for c in cefr if c.get("source") == "cefr_j"),
        "cefr_octanove": sum(1 for c in cefr if c.get("source") == "octanove"),
        "frequency_ngsl_entries": len(freq_entries),
        "wordnet_matches": len(wn_matches),
        "wordnet_relationships": len(_rows(out / "semantic_relationships.jsonl")),
        "provenance_records": len(_rows(out / "provenance_records.jsonl")),
    }

    summary = {
        "total_entries": len(entries),
        "total_senses": len(senses),
        "senses_with_polish_translation": senses_with_pl,
        "senses_with_cefr": senses_with_cefr,
        "entries_with_ngsl_frequency": len(freq_entries),
        "senses_matched_to_wordnet": senses_with_wn,
        "rejected_senses": len(rejected_senses),
        "rejected_translations": len(rejected_trans),
        "conflicts": len(conflicts),
        "quality_issues": (validate_result or {}).get("issues", 0),
        "source_coverage": coverage,
    }

    _write_csv(
        reports / "invalid-records.csv",
        ["entity_type", "entity_key", "issue_code", "severity", "message"],
        [
            [i.get("entity_type"), i.get("entity_key"), i.get("issue_code"), i.get("severity"), i.get("message")]
            for i in _rows(out / "quality_issues.jsonl")
        ],
    )
    _write_csv(reports / "cefr-conflicts.csv", ["entity_key", "sources", "levels", "resolution"], cefr_conflict_rows)
    _write_csv(reports / "unmatched-cefr.csv", ["lemma", "pos", "level", "source"], unmatched_cefr)
    _write_csv(reports / "unmatched-wordnet.csv", ["entry_key", "sense_position", "definition"], unmatched_wn)
    _write_csv(reports / "duplicate-senses.csv", ["entry_key", "detail"], dup_rows)
    _write_csv(reports / "missing-polish-translations.csv",
               ["entry_key", "sense_position", "definition", "lemma"], missing_pl_rows)
    _write_csv(reports / "source-coverage.csv", list(coverage.keys()), [list(coverage.values())])

    (reports / "pipeline-summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (reports / "pipeline-summary.md").write_text(_markdown(summary), encoding="utf-8")
    return summary


def _markdown(summary: dict) -> str:
    cov = summary["source_coverage"]
    lines = [
        "# Pipeline summary",
        "",
        f"- Entries: **{summary['total_entries']:,}**",
        f"- Senses: **{summary['total_senses']:,}**",
        f"- Senses with Polish translation: **{summary['senses_with_polish_translation']:,}**",
        f"- Senses with CEFR: **{summary['senses_with_cefr']:,}**",
        f"- Entries with NGSL frequency: **{summary['entries_with_ngsl_frequency']:,}**",
        f"- Senses matched to WordNet: **{summary['senses_matched_to_wordnet']:,}**",
        f"- Rejected senses: **{summary['rejected_senses']:,}**",
        f"- Rejected translations: **{summary['rejected_translations']:,}**",
        f"- Conflicts: **{summary['conflicts']:,}**",
        f"- Quality issues: **{summary['quality_issues']:,}**",
        "",
        "## Source coverage",
        "",
        f"- Wiktextract senses: {cov['wiktextract_senses']:,}",
        f"- Polish translations from Wiktextract: {cov['translations_wiktextract']:,}",
        f"- CEFR assignments from CEFR-J: {cov['cefr_cefr_j']:,}",
        f"- CEFR assignments from Octanove: {cov['cefr_octanove']:,}",
        f"- Entries with NGSL frequency: {cov['frequency_ngsl_entries']:,}",
        f"- WordNet sense→synset matches: {cov['wordnet_matches']:,}",
        f"- WordNet relationships: {cov['wordnet_relationships']:,}",
        f"- Provenance records: {cov['provenance_records']:,}",
        "",
    ]
    return "\n".join(lines)
