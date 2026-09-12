# Vocabulary Reconciliation Rules

How the five sources are merged into one sense-centric model, and how conflicts are
handled. Rows that lose the reconciliation are always recorded with provenance —
never silently dropped.

## 1. Identity model

- **Entries** are keyed `(normalized_lemma, part_of_speech)`. `normalized_lemma` is
  case-folded and whitespace-collapsed (hyphens preserved); POS is canonicalized
  (`noun`, `verb`, `adjective`, `adverb`, …).
- **Senses** live inside an entry, keyed `(vocabulary_entry_id, position)`. Positions are
  assigned in first-seen order during normalize.
- **Sense dedup**: a sense is keyed by `(entry_key, normalized_definition, sorted tags)`.
  Identical definitions with identical tags collapse — including across separate Wiktextract
  records (e.g. `bank` has one Wikitext noun record for the financial senses and another for
  the river senses; both merge into a single `bank|noun` entry with distinct senses).
- Records whose lemma normalizes to empty (symbols like `♥`) are excluded from entries.

## 2. Enrichments

### CEFR (CEFR-J 1.5 + Octanove C1/C2 1.0)

- Both sources are **entry-level** (word + POS). Nothing in them is sense-level.
- For every entry matched by either source, the assigned level is applied to **every** sense of
  the entry, with `match_method='lemma+pos'`, `confidence='MEDIUM'`, and
  `requires_review=TRUE`. The pipeline never claims a sense-specific CEFR value.
- When CEFR-J and Octanove disagree on an entry, **both claims are kept** (they are distinct
  `cefr_assignments` rows) and one `reconcile_conflicts` row is emitted (`field_name='cefr'`).
  The winner is never chosen automatically; the row is flagged for human review.
- Unmatched CEFR rows (lemma/POS not present in the extract) are listed in
  `reports/unmatched-cefr.csv`.

### NGSL (1.2)

- Lemma-level, no POS. Attached per entry via `normalized_lemma` (any POS), storing `rank`,
  `sfi`, and `frequency_per_million`. On a `(vocabulary_entry_id, source_id)` conflict the
  existing row wins.

### WordNet (Open English WordNet 2025)

- Synsets are loaded wholesale (107,519). Each sense's definition is compared against the
  definitions of the candidate synsets for its entry's POS using `gloss_affinity`:

  ```
  gloss_affinity = 0.5 * content-token DICE + 0.35 * token coverage + 0.15 * bigram DICE
  ```

  over stopword-filtered content tokens.
- **Winner-margin rule**: the best candidate is accepted only if its score clears the
  floor (default 0.25) *and* beats every rival by a margin (default 0.12). Ties lose.
  No best-match is ever guessed.
- A sense with candidates but no confident winner is reported in
  `reports/unmatched-wordnet.csv`. A sense without candidates is untouched (no flag).
- Each accepted match records `match_method`, `confidence`, and `score` on `sense_synsets`.

### Polish translations (Wiktextract)

- Wikitext translations carry a natural-language `sense` label (e.g. “edge of river or lake”)
  and often a `tags` hint. Each translation is matched **per sense** by comparing the label
  against every gloss of the entry:
  - Label tokens that are a subset of a gloss's content tokens score **1.0** (covers labels
    like “institution” → financial `bank`); otherwise token-DICE similarity.
  - Best sense wins; `match_confidence` = HIGH/MEDIUM/LOW by label/score; `match_method`
    and `match_score` are stored.
- Translations that match no sense are counted and reported as a quality issue
  (`translation_unmatched`) and kept in `rejected_translations.jsonl`.

## 3. Conflict and quality handling

- **Conflicts** (`reconcile_conflicts`): only irreducible disagreements across sources are
  recorded (primarily CEFR entry level). Each row stores `sources[]`, `values[]`,
  `resolution`, and `requires_review`.
- **Quality flags** (`quality_flags`): issued by `quality/validators.py` for things like
  empty definitions, duplicate senses, surrogate characters, and unmatched translations.
- **Rejected rows** are written to `data/rejected/` and enumerated in validation output.

## 4. Sample-run numbers (20000-record sample)

| Metric | Value |
|---|---|
| entries | 16,760 |
| senses | 60,657 |
| translations | 20,612 (loaded, after unique dedup) |
| examples | 78,121 |
| CEFR assignments | 26,099 |
| NGSL frequency rows | 3,437 |
| WordNet synsets | 107,519 |
| sense→synset matches | 10,084 |
| semantic relationships | 131,098 |
| provenance records | 73,505 |
| reconcile conflicts | 33 |
| quality flags | 51 |

Golden check on the sample: `bank|noun` sense “An edge of river, lake, or other watercourse.”
→ `brzeg`; “An institution where one can place and borrow money …” → `bank`, synset
`08437235-n`, CEFR A1, NGSL rank 627.