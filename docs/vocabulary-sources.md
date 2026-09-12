# Vocabulary Sources — Field Mapping & Caveats

Factual snapshot per source from direct file inspection (see
[`vocabulary-data-audit.md`](./vocabulary-data-audit.md) for the raw structures).
All five sources ship with **no license metadata** — `vocabulary_sources.license` is set to
`License must be verified` until the client confirms terms.

## 1. Wiktextract / Kaikki — `raw-wiktextract-data.jsonl`

- 24.7 GB JSONL, 10,913,996 lines, one record per line. Extracted streaming (bounded memory,
  only English records kept via `lang_code`).
- **Normalize** (`sources/wiktextract.py → pipeline/normalize.py`):
  - entry: `word` + canonicalized `pos`.
  - sense: first `glosses[]` entry → definition; `raw_glosses[0]` kept as the raw definition;
    `senseid`/`wikidata` (per-sense QID) preserved.
  - translations: `translations[]` records kept as-is for the label matcher; the target language
    is `pl`.
  - examples: `examples[].text`.
- **Caveats**: senses have no stable IDs; some records carry duplicate glosses (deduped);
  symbol lemmas such as `♥` normalise to empty and are skipped; no license declared.

## 2. CEFR-J — `cefrj-vocabulary-profile-1.5.csv`

- 7,799 rows, `word + POS + CEFR level` (A1–B2). Latched lemmas written as
  `lemma(POS)`.
- **Mapping**: word → `normalized_lemma`, POS canonicalized, level → `cefr_assignments` at
  entry level.
- **Caveats**: entry-level only (no sense granularity); the CSV contains only the "core" level
  per word (variant senses not covered by this profile); source uses an old JEFLL-style POS set
  that is canonicalized.

## 3. Octanove C1/C2 — `octanove-vocabulary-profile-c1c2-1.0.csv`

- 2,136 rows, `word + POS + CEFR level` (C1–C2), designed to extend CEFR-J.
- **Mapping**: same as CEFR-J; merged into the same `cefr_assignments` table with
  `source='octanove'`.
- **Caveats**: genuinely contains in-source conflicts with CEFR-J (documented in the audit);
  these become `reconcile_conflicts` rows, neither claim is dropped.

## 4. Open English WordNet 2025 — `english-wordnet-2025-json`

- 128,009 entries / 107,519 synsets; per-file JSON dicts: `entries-*.json`,
  `noun.*.json`, `verb.*.json`, `adj.*.json`, `adv.*.json`.
- **Mapping**:
  - synsets → `wordnet_synsets` (definition, members, ILI, Wikidata QIDs; multiple QIDs are
    joined with `|`).
  - entries → `canonical_wordnet_entries`, relationships (`hypernym`, `hyponym`, `instance hypernym`, …)
    → `semantic_relationships`.
  - sense↔synset links are computed in **reconcile** via `gloss_affinity` + winner-margin rule.
- **Caveats**: synset `partOfSpeech` values are full names (`adjective`, `adverb`, …); a synset
  can carry several Wikidata QIDs; definitions are gloss-normalized dictionaries with the first
  gloss used.

## 5. NGSL — `NGSL_1.2_stats.csv`

- 2,809 rows, lemma-level, **no POS**, columns include `Rank`, `SFI`, `U`.
- **Mapping**: `Rank` → `frequency_data.rank`, `SFI` → `sfi`, `U` →
  `frequency_per_million`; attached per entry on `(normalized_lemma)`.
- **Caveats**: lemma-level frequency applies to every sense of an entry; homographs are not
  distinguished by POS in this source.