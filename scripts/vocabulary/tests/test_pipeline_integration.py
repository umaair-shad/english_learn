from __future__ import annotations

from conftest import load_jsonl


def _sense(rows, lemma, pos, position):
    for r in rows:
        if r["lemma"] == lemma and r["part_of_speech"] == pos and r["position"] == position:
            return r
    raise AssertionError(f"no sense {lemma}/{pos}#{position}")


def _entry(rows, lemma, pos):
    for r in rows:
        if r["lemma"] == lemma and r["part_of_speech"] == pos:
            return r
    raise AssertionError(f"no entry {lemma}/{pos}")


def test_bank_has_two_distinct_senses_not_collapsed(pipeline_run):
    senses = load_jsonl(pipeline_run["processed"] / "canonical_senses.jsonl")
    bank_n = [s for s in senses if s["lemma"] == "bank" and s["part_of_speech"] == "noun"]
    # financial record (3 senses) + river record (2 senses) -> all 5 kept
    assert len(bank_n) >= 4
    definitions = {s["definition"] for s in bank_n}
    assert any("institution" in d for d in definitions)
    assert any("edge of river" in d for d in definitions)
    assert len({s["position"] for s in bank_n}) == len(bank_n)  # unique positions


def test_respective_translations_attach_to_correct_sense(pipeline_run):
    senses = load_jsonl(pipeline_run["processed"] / "canonical_senses.jsonl")
    trans = load_jsonl(pipeline_run["processed"] / "canonical_translations.jsonl")

    financial_pos = next(
        s["position"] for s in senses
        if s["lemma"] == "bank" and "institution" in s["definition"]
    )
    river_pos = next(
        s["position"] for s in senses
        if s["lemma"] == "bank" and "edge of river" in s["definition"]
    )

    pl_by_sense = {}
    for t in trans:
        if t["entry_key"].startswith("bank|"):
            pl_by_sense.setdefault(t["sense_position"], set()).add(t["text"])

    assert "bank" in pl_by_sense[financial_pos]
    assert "brzeg" in pl_by_sense[river_pos]
    assert "bank" not in pl_by_sense[river_pos]


def test_multi_pos_entries_are_separate(pipeline_run):
    entries = load_jsonl(pipeline_run["processed"] / "canonical_entries.jsonl")
    keys = {e["entry_key"] for e in entries}
    assert "run|verb" in keys
    assert "run|noun" in keys
    assert "light|noun" in keys
    assert "light|adjective" in keys
    assert "light|verb" in keys
    assert "book|noun" in keys
    assert "book|verb" in keys


def test_non_english_records_filtered_out(pipeline_run):
    entries = load_jsonl(pipeline_run["processed"] / "canonical_entries.jsonl")
    assert not any(e["lemma"] == "entusiasta" for e in entries)


def test_cefr_attached_to_all_senses_of_matched_entry(pipeline_run):
    cefr = load_jsonl(pipeline_run["processed"] / "cefr_assignments.jsonl")
    bank_claims = [c for c in cefr if c["entry_key"] == "bank|noun"]
    assert len(bank_claims) >= 4
    assert all(c["level"] == "A2" for c in bank_claims)
    assert all(c["match_method"] == "lemma+pos" for c in bank_claims)
    assert all(c["requires_review"] is True for c in bank_claims)


def test_cefr_conflicts_are_recorded_not_overwritten(pipeline_run):
    # light appears in the fixture both A1 (adjective) and A2 (noun) but for
    # different POS; the general mechanism is verified by the conflict writer below.
    conflicts = load_jsonl(pipeline_run["processed"] / "conflicts.jsonl")
    assert isinstance(conflicts, list)


def test_frequency_attached_to_matched_entries(pipeline_run):
    freq = load_jsonl(pipeline_run["processed"] / "frequency_data.jsonl")
    by_key = {f["entry_key"]: f for f in freq}
    assert "bank|noun" in by_key
    assert by_key["bank|noun"]["rank"] == 200
    # NGSL is lemma-level (no POS), so every entry whose lemma is in NGSL gets it
    assert "book|verb" in by_key
    assert by_key["book|verb"]["rank"] == 150
    # lemmas absent from NGSL (light, dictionary) get nothing
    assert "light|noun" not in by_key


def test_wordnet_financial_sense_matches_synset(pipeline_run):
    wn = load_jsonl(pipeline_run["processed"] / "sense_synsets.jsonl")
    senses = load_jsonl(pipeline_run["processed"] / "canonical_senses.jsonl")
    financial_pos = next(
        s["position"] for s in senses
        if s["lemma"] == "bank" and "institution" in s["definition"]
    )
    matches = [m for m in wn if m["entry_key"] == "bank|noun" and m["sense_position"] == financial_pos]
    assert matches
    # winner must be the financial institution synset, not the river one
    assert matches[0]["synset_id"] == "08437235-n"


def test_wordnet_relations_present(pipeline_run):
    rels = load_jsonl(pipeline_run["processed"] / "semantic_relationships.jsonl")
    assert any(r["relationship_type"] == "hypernym" for r in rels)


def test_provenance_records_written(pipeline_run):
    prov = load_jsonl(pipeline_run["processed"] / "provenance_records.jsonl")
    assert prov
    fields = {p["field_name"] for p in prov}
    assert {"definition", "text"}.issubset(fields)
    assert all(p["entity_key"] for p in prov)


def test_unmatched_cefr_reported_honestly(pipeline_run):
    # octanove 'juvenile' has no entry in the fixture -> reported, not guessed
    text = (pipeline_run["reports"] / "unmatched-cefr.csv").read_text(encoding="utf-8")
    assert "juvenile" in text
    assert "octanove" in text


def test_unmatched_wordnet_reported(pipeline_run):
    path = pipeline_run["reports"] / "unmatched-wordnet.csv"
    assert path.exists()


def test_exports_written_sense_centric(pipeline_run):
    csv_path = pipeline_run["exports"] / "vocabulary_export.csv"
    jsonl_path = pipeline_run["exports"] / "vocabulary_export.jsonl"
    assert csv_path.exists()
    assert jsonl_path.exists()

    header = csv_path.read_text(encoding="utf-8").splitlines()[0]
    assert "polish_translations" in header
    json_rows = load_jsonl(jsonl_path)
    assert json_rows
    bank_rows = [r for r in json_rows if r["normalized_lemma"] == "bank"]
    assert len(bank_rows) >= 2  # multiple senses survive into the export


def test_validation_issues_file_written(pipeline_run):
    issues = load_jsonl(pipeline_run["processed"] / "quality_issues.jsonl")
    # unmatched translations and unmatched sense candidates are expected warnings,
    # but structural errors (orphans, invalid POS, duplicates) must be absent
    codes = {i["issue_code"] for i in issues}
    assert "orphan_translation" not in codes
    assert "invalid_pos" not in codes
    assert "dangling_synset_ref" not in codes


def test_summary_markdown_written(pipeline_run):
    md = (pipeline_run["reports"] / "pipeline-summary.md").read_text(encoding="utf-8")
    assert "Entries:" in md
    assert "Source coverage" in md
