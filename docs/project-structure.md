# Project Structure

> Status snapshot: 2026-09-09 — Phase 1 sample build (20,000 Wiktextract records) has been
> run end-to-end and loaded into PostgreSQL. Contents of `data/` reflect that run.

## Directory tree

```
project_english/
├── .env                          # runtime secrets/paths (gitignored)
├── .env.example                  # documented template for every setting
├── .gitignore
├── docker-compose.yml            # local PostgreSQL 16 (vocab/vocab/vocabulary)
├── README.md                     # pipeline overview, setup, commands, design notes
│
├── data/                         # pipeline runtime output (gitignored)
│   ├── raw/                      # reserved for dataset copies (currently empty; real
│   │                             #   sources live outside the repo — see RAW_DATASET_DIR)
│   ├── staging/                  # extract/normalize intermediates + bulk COPY CSVs
│   ├── processed/                # canonical output consumed by validate/report/export/load
│   ├── rejected/                 # rows that failed normalization (empty this run)
│   ├── reports/                  # QC CSV reports + pipeline summary
│   └── exports/                  # downloadable vocabulary exports
│
├── database/
│   └── migrations/
│       └── 001_vocabulary_schema.sql   # SQL mirror of database/schema.py DDL
│
├── docs/
│   ├── vocabulary-data-audit.md       # verified raw schemas/sizes of all 5 sources
│   ├── vocabulary-reconciliation.md   # merge/conflict rules + sample-run numbers
│   ├── vocabulary-sources.md          # per-source field mapping and caveats
│   └── project-structure.md           # this file
│
└── scripts/
    ├── vocabulary/                    # the pipeline package (editable-installed)
    │   ├── pyproject.toml
    │   ├── src/vocabulary_pipeline/
    │   └── tests/
    └── data/                          # STALE leftover from an earlier path bug — see note
```

> Note: `scripts/data/` contains only an old `staging/manifest.json` + canonical files generated
> while `config.py` resolved the repo root one level too shallow (fixed). It is unused and safe to delete.

---

## Root files

| File | Purpose |
|---|---|
| `.env` | Runtime config copy: `DATA_ROOT`, `RAW_DATASET_DIR`, `DATABASE_URL`, `PIPELINE_LIMIT=20000`, `MIN_GLOSS_SIMILARITY=25`. Gitignored; not committed. |
| `.env.example` | Commit-safe template with the same keys and safe defaults (`MIN_GLOSS_SIMILARITY=58`, default DB URL). |
| `.gitignore` | Excludes raw datasets, all `data/` runtime output, Python caches, `.env`, pgdata. |
| `docker-compose.yml` | `postgres:16` service `vocabulary-postgres`, credentials `vocab/vocab/vocabulary`, port 5432, named volume `vocab_pgdata`, `pg_isready` health-check. |
| `README.md` | What the pipeline does, stage table, layout, setup/usage commands, design decisions, projected full-run timings, caveats. |

---

## `database/`

| File | Purpose |
|---|---|
| `migrations/001_vocabulary_schema.sql` | Full DDL mirror (entries, senses, translations, examples, cefr_assignments, frequency_data, wordnet_synsets, sense_synsets, semantic_relationships, provenance_records, quality_flags, reconcile_conflicts, categories, vocabulary_category_assignments, running sources/imports) + indexes, all idempotent (`IF NOT EXISTS`). Kept in sync with `database/schema.py`. |

---

## `scripts/vocabulary/` — pipeline package

### `pyproject.toml`
Editable-install metadata (`pip install -e "scripts/vocabulary[dev,fuzzy]"`), ruff + pytest tool config
(line-length 130, target py311), optional extras: `dev` (pytest, ruff) and `fuzzy` (rapidfuzz).

### `src/vocabulary_pipeline/` — the package

| File/Dir | Purpose |
|---|---|
| `__init__.py` | Package marker. |
| `cli.py` | Entry point. Commands: `inspect`, `build` (`--sources/--limit/--resume/--stage/--load-postgres/--dry-run`), `extract` (`--source/--limit/--resume`), `validate`, `report`, `export` (`--format`), `load-postgres` (`--dry-run`/`--force`). |
| `config.py` | Immutable `Config` built from env/`.env`; resolves `DATA_ROOT` to repo root (parent of `scripts/`); per-source file layout; `ensure_directories()`. |
| `logging.py` | Rich console logger (`vocabulary_pipeline`). |

**`normalization/`** — canonicalization helpers
| File | Purpose |
|---|---|
| `lemma.py` | Case-fold + whitespace-collapse lemmas (hyphens preserved). |
| `pos.py` | Wikitext/CEFR/WordNet POS → one canonical POS set (dedup-keyed mapping). |
| `text.py` | `simple_normalize`, `lookup_normalize` (used in entry/sense translation keys). |
| `language.py` | `is_primary_language()` for the English filter. |

**`models/`** — canonical dataclasses
| File | Purpose |
|---|---|
| `canonical.py` | Entry / Sense / Translation / Example / DedupKey models. |
| `source_records.py` | Typed source-record shapes from the extractors. |

**`sources/`** — per-source streaming loaders (write `staging/extract_*.jsonl`)
| File | Purpose |
|---|---|
| `wiktextract.py` | Streaming JSONL reader (incremental UTF-8 decode, bounded memory), English filter, minimal sense/translation/example projection; emits one record per source `line:N`. |
| `cefr_j.py` | 7,799-row CSV → canonical CEFR records. |
| `octanove.py` | 2,136-row CSV → canonical CEFR records. |
| `wordnet.py` | Parses synset JSON files (`noun.*.json`, `entries-*.json`, …) into synsets + entries; joins multi-QID Wikidata into `\|`-delimited string. |
| `ngsl.py` | 2,809-row NGSL CSV → lemma-level frequency records. |

**`pipeline/`** — stage orchestration + IO
| File | Purpose |
|---|---|
| `io.py` | `Manifest` (resume tracking), `iter_jsonl`, `jsonl_writer`. |
| `extract.py` | Runs the requested source loaders into staging. |
| `normalize.py` | Wiktextract → canonical entries/senses/translations/examples; dedup `(entry_key, def, tags)` incl. cross-record; filters empty-lemma records; passthrough of CEFR/NGSL/WordNet canonical files. |
| `reconcile.py` | CEFR (entry-level to all senses, `requires_review`), NGSL rank, WordNet gloss↔synset matching, translation label→sense matching, conflict + provenance emission; copies canonical files into `processed/`. |
| `validate.py` | Runs `quality/validators.py`, writes issues. |
| `export.py` | Wraps `exports/streaming.py` (`csv`/`jsonl`/`excel`). |
| `load.py` | Wraps `database/bulk_load.py`; records stage in manifest. |

**`matching/`** — similarity engines
| File | Purpose |
|---|---|
| `__init__.py` | `STOPWORDS`, `content_tokens`, and `gloss_affinity` (DICE + coverage + bigram-DICE over content tokens). |
| `wordnet.py` | Margin-based synset selection: accept best candidate only if ≥ floor (0.25) and beats rivals by margin (0.12); never guesses. |
| `translations.py` | Label→gloss matching incl. token-subset short labels → 1.0 score. |
| `cefr.py` | Entry-level CEFR assignment helper + conflict detection. |

**`quality/`** — QC
| File | Purpose |
|---|---|
| `validators.py` | Rules: empty definition, duplicate sense, surrogate chars, unmatched translation, CEFR conflicts. |
| `reporting.py` | Writes `reports/*.csv` + `pipeline-summary.{json,md}`. |

**`exports/`**
| File | Purpose |
|---|---|
| `streaming.py` | `Exporter` builds one sense-centric row per (entry, sense) with delimited `polish_translations`/`cefr`/`wordnet_synsets`/`frequency_rank`; CSV/JSONL/Excel. |

**`database/`** — PostgreSQL
| File | Purpose |
|---|---|
| `schema.py` | **Authoritative DDL** + staging temp-table DDL + `MERGES_SQL` (split into param-free + `MERGE_CONFLICTS/PROVENANCE/QUALITY_SQL` with `run_id`) + source seeds. |
| `postgres.py` | `connect()` with psycopg3 `dict_row`; clear errors when psycopg/DATABASE_URL missing. |
| `bulk_load.py` | `CsvBuilder` (processed JSONL → COPY-ready CSVs), content fingerprint, temp-table COPY via `cur.copy()`, transactional merge + run tracking, idempotent fingerprint skip. |

### `tests/` — golden-fixture suite (38 tests, all passing; `ruff` clean)

| File | Purpose |
|---|---|
| `conftest.py` | Full extract→normalize→reconcile→validate→export pipeline over fixtures. |
| `test_normalization.py` | Lemma/POS/text normalization cases. |
| `test_matching.py` | `gloss_affinity` + WordNet margin + translation label matching. |
| `test_pipeline_integration.py` | `bank` multi-sense merge (financial vs river), `brzeg`, CEFR per sense, NGSL rank, WordNet winner, provenance, exports. |
| `fixtures/raw-wiktextract-data.jsonl` | 10 records (dictionary, bank ×2, run, light, book, Italian `entusiasta`). |
| `fixtures/cefrj-vocabulary-profile-1.5.csv`, `octanove-vocabulary-profile-c1c2-1.0.csv`, `NGSL_1.2_stats.csv` | Trimmed source profiles. |
| `fixtures/english-wordnet-2025-json/` | `entries-a.json`, `noun.group.json`, `noun.object.json`, `verb.possession.json` (bank financial + river synsets). |

---

## `data/` — runtime artifacts (all gitignored)

### `staging/`
| Group | Files |
|---|---|
| extract | `extract_{wiktextract,cefr_j,octanove,ngsl,wordnet_synsets,wordnet_entries}.jsonl` |
| canonical | `canonical_{entries,senses,translations,examples,cefr,frequency,wordnet_synsets,wordnet_entries}.jsonl` |
| `manifest.json` | Per-stage completion map (resume cursor). |
| `bulk/` | `stage_*.csv` — 12 COPY-ready files built by `CsvBuilder`. |

### `processed/` — canonical output consumed downstream
| File | Description | Rows (20k sample) |
|---|---|---|
| `canonical_entries.jsonl` | Entries `(normalized_lemma, pos)` | 16,760 |
| `canonical_senses.jsonl` | Senses with defs/tags/order | 60,657 |
| `canonical_translations.jsonl` | Polish translations matched to senses | ~21,063 |
| `canonical_examples.jsonl` | Example sentences | ~78,124 |
| `canonical_wordnet_synsets.jsonl` | Synset records | 107,519 |
| `canonical_wordnet_entries.jsonl` | WordNet entries | 135,969 |
| `cefr_assignments.jsonl` | Per-sense CEFR (entry-level propagated) | 26,176 |
| `frequency_data.jsonl` | NGSL lemma-level frequency | 3,437 |
| `sense_synsets.jsonl` | Accepted gloss→synset matches | 10,084 |
| `semantic_relationships.jsonl` | WordNet relations | 131,098 |
| `provenance_records.jsonl` | Value-level lineage | 81,720 |
| `conflicts.jsonl` | CEFR cross-source conflicts | 33 |
| `quality_issues.jsonl` | Validation flags | 51 |
| `rejected_{senses,translations}.jsonl` | Dropped rows (empty in this run) | — |

### `reports/`
`cefr-conflicts.csv`, `duplicate-senses.csv`, `invalid-records.csv`, `missing-polish-translations.csv`,
`source-coverage.csv`, `unmatched-cefr.csv`, `unmatched-wordnet.csv`, `pipeline-summary.{json,md}`.

### `exports/`
`vocabulary_export.csv` / `vocabulary_export.jsonl` — 60,657 sense-centric rows.

### `raw/` and `rejected/`
Placeholders; real datasets live in the client's folder (`RAW_DATASET_DIR`), rows rejected
this run were none.

---

## PostgreSQL (running container)

Tables currently loaded (run 1, fingerprint `d432955e0108c3f3`):

| Table | Rows |
|---|---|
| vocabulary_entries | 16,760 |
| vocabulary_senses | 60,657 |
| translations | 20,612 |
| example_sentences | 78,121 |
| cefr_assignments | 26,099 |
| frequency_data | 3,437 |
| wordnet_synsets | 107,519 |
| sense_synsets | 10,084 |
| semantic_relationships | 131,098 |
| provenance_records | 73,505 |
| reconcile_conflicts | 33 |
| quality_flags | 51 |

Fully normalized tables (`vocabulary_sources`, `vocabulary_import_runs`, `categories`…) also present.