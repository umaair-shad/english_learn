# English–Polish Personalized Learning Platform

Production web platform for teaching English to Polish-speaking students.

- **Teacher workspace** (`apps/web`, port 3001): students, vocabulary search, taxonomy, sets, assignments, activities, live monitoring, reports, import/export, password change.
- **API** (`apps/api`, port 3000, `/api/v1`): NestJS + Prisma + PostgreSQL. Swagger at `/api/docs`.
- **Students**: no passwords. Private URLs `/s/[token]` or `/student/[token]`. Optional activity links `/play/[token]` (permanent, expiring, or single-use).
- **Activities**: Flashcards (EN↔PL), Memory, Quiz, Fill-in-the-Blank. Shared FSRS state and standardized events.
- **Live teacher mirror**: WebSocket application-state sync (not screen sharing).

Local run: `docker compose up -d`, then `npm run start:dev` in `apps/api` and `npm run dev` in `apps/web`.

See `docs/architecture.md`, `docs/deployment-production.md`, and `docs/operations.md`.

---

# Vocabulary Platform — Phase 1 Data Pipeline

Unifies five English vocabulary sources (Wiktextract, CEFR-J, Octanove, Open English
WordNet, NGSL) into **one** sense-centric PostgreSQL database with full provenance,
conflict reporting, and idempotent bulk loading.

## Pipeline stages

```
extract → normalize → reconcile → validate → report → export → load-postgres
```

| Stage        | Reads raw sources and streams canonical JSONL into `data/staging/` |
|--------------|--------------------------------------------------------------------------|
| `extract`    | Wiktextract (English-only, streaming), CEFR-J, Octanove, WordNet synsets + entries, NGSL |
| `normalize`  | Lemma/POS canonicalization + case folding; keeps definitions, Polish translations, examples; dedupes senses by `(entry_key, normalized_definition, tags)` |
| `reconcile`  | CEFR (entry-level, applied to all senses with `requires_review`), NGSL rank, WordNet gloss matching (winner-margin rule), conflict detection, provenance tagging |
| `validate`   | QC rules → `data/reports/*.csv` + `quality_issues.jsonl` |
| `report`     | Regenerates QC reports only |
| `export`     | Sense-centric CSV / JSONL / Excel exports |
| `load-postgres` | COPY staging CSVs into temp tables, then idempotent `ON CONFLICT` merges + fingerprint skip |

## Layout

```
scripts/vocabulary/src/vocabulary_pipeline/
    cli.py                 # all commands
    config.py              # env-driven Config (paths, DB, limits)
    sources/               # per-source extractors/loaders
    pipeline/              # normalize, reconcile, export, load, io (manifest)
    matching/              # gloss_affinity, wordnet match, translation-label match, cefr
    normalization/         # lemma/POS/text normalization
    quality/               # validators + reporting
    database/              # schema.py (authoritative DDL), bulk_load.py, postgres.py
    exports/               # CSV/JSONL/Excel exporters
database/migrations/       # SQL mirror of database/schema.py
docs/                      # data audit, sources, reconciliation guides
data/                      # raw|staging|processed|rejected|reports|exports (gitignored)
docker-compose.yml         # PostgreSQL 16 for local dev
.env.example               # all knobs with safe defaults
```

## Setup

```powershell
python -m pip install -e "scripts/vocabulary[dev,fuzzy]"
docker compose up -d
Copy-Item .env.example .env
# edit .env: set RAW_DATASET_DIR to the folder holding the five client datasets
```

`DATA_ROOT` defaults to the repository `data/` dir. Nothing is hard-coded per machine.

## Usage

```powershell
# whole sample build (20000 English records by default via PIPELINE_LIMIT)
python -m vocabulary_pipeline.cli build --limit 20000

# then load into PostgreSQL (idempotent; requires DATABASE_URL + docker db)
python -m vocabulary_pipeline.cli load-postgres

# other commands
python -m vocabulary_pipeline.cli inspect     # naive preview of raw sources (dev only)
python -m vocabulary_pipeline.cli extract --source wiktextract --limit 50000 --resume
python -m vocabulary_pipeline.cli validate    # QC reports only
python -m vocabulary_pipeline.cli report
python -m vocabulary_pipeline.cli export --format csv|jsonl|excel
python -m vocabulary_pipeline.cli load-postgres --dry-run   # schema+COPY check, no merge
python -m vocabulary_pipeline.cli load-postgres --force     # skip fingerprint check
```

`--resume` skips stages already recorded in `data/staging/manifest.json`.

## Design decisions

- **Sense-centric**: one DB row per (entry, sense); entries keyed `(normalized_lemma, part_of_speech)`.
- **Dedup**: senses collapsed on `(entry_key, normalized_definition, sorted tags)` — both within one
  Wiktextract record and across records (e.g. `bank` financial + river merge into one `bank|noun` entry).
- **CEFR** is entry-level (CEFR-J says nothing about individual senses): applied to *every* sense of a
  matched entry and flagged `requires_review`; conflicting claims across CEFR-J/Octanove are recorded
  in `reconcile_conflicts`, never silently overwritten.
- **NGSL** is lemma-level (no POS): attached per entry via `(normalized_lemma)`.
- **WordNet** senses are matched to synsets by content-aware `gloss_affinity`
  (token-dice + coverage + bigram-dice on stopword-filtered tokens) with a winner-margin rule —
  never guessed; a candidate is only accepted if it beats all rivals by a margin.
- **Polish translations** carry free-text sense labels in Wikitext; each label is confidence-matched to
  a gloss. Short labels (e.g. “institution”) that are token-subsets of a gloss score 1.0.
- **Provenance per value**: every row records source, source version, source record id, match method,
  confidence, and import run.
- **Idempotent load**: data is streamed to temp tables via PostgreSQL `COPY`, merged with
  `ON CONFLICT DO NOTHING`, and the whole run is guarded by a content fingerprint of the processed
  output — re-running the same data is a no-op.

## Working the full dataset

The sample build uses `PIPELINE_LIMIT` (default 20000 English records). For the full build remove the
limit (`load-postgres` is unrelated to it). Estimated full-run scale from the 20k sample
(extrapolated to ~1.19M English records, streaming, single process):

| | sample (20k) | projected full |
|---|---|---|
| Wiktextract extract | ~1 s | ~10–15 min |
| normalize | ~14 s | ~15–20 min |
| reconcile | ~30 s | ~30–45 min |

WordNet (128k entries / 107k synsets) and NGSL are processed once regardless of the Wiktextract limit.

## Notes / caveats

- License metadata is **absent** from every dataset; `vocabulary_sources.license` currently reads
  `License must be verified` until the client confirms terms.
- `inspect` is a quick dev preview that reads arbitrary JSONL chunks — not a validation tool.
- Tests (38) run against the golden fixtures in `tests/fixtures/`; run them with `python -m pytest`.

```powershell
python -m ruff check src tests
python -m pytest
```