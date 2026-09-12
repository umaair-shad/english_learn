# Vocabulary Data Audit

Audit date: 2026-09-09
Auditor: vocabulary pipeline Phase 1

This document records the **actual** schemas and characteristics of the five source
datasets as observed by direct file inspection. No assumptions are made about columns
that were not verified against the real files.

---

## 1. Wiktextract / Kaikki — `raw-wiktextract-data.jsonl`

### File facts

| Property           | Value |
|--------------------|-------|
| Path               | `raw-wiktextract-data.jsonl/raw-wiktextract-data.jsonl` |
| Format             | JSONL (one JSON object per line, no enclosing array) |
| Encoding           | UTF-8 |
| Compression        | None (plain text) |
| Size               | 24,783,416,211 bytes (~24.7 GB) |
| Line count         | 10,913,996 lines (counted by streaming read) |
| English share      | ~10.87% of a 100k-record sample → estimated ~1.19M English records |
| Language field     | `lang_code` (standard ISO-639 codes, e.g. `en`, `zh`, `mul`) |
| Language name      | `lang` (display name, e.g. `English`) |

### Record structure (single JSON object per line)

Top-level keys observed:

```json
[
  "senses", "pos", "head_templates", "categories", "forms",
  "hyponyms", "derived", "related", "descendants", "translations",
  "etymology_text", "etymology_templates", "sounds", "hyphenations",
  "word", "lang", "lang_code", "synonyms", "hypernyms",
  "coordinate_terms", "meronyms"
]
```

Other top-level keys appear on some records only (not all records have all keys):

* `etymology_number`
* `wikipedia`
* `pronunciations`
* `inflection`
* `proverbs`, `aphorisms`, `sayings` (rare)

### Entity granularity

* **Record level** = one lexeme sense-set. A single record covers **one word form and one
  part of speech** (e.g. `bank` as `noun` is one record; `bank` as `verb` is another).
  Some words with multiple etymologies produce **multiple records for the same word+POS**.
* **Sense level** = the `senses[]` array. Each element is one dictionary sense.

### Key fields

| Field                | Type      | Description                                                      | Used in pipeline |
|----------------------|-----------|------------------------------------------------------------------|------------------|
| `word`               | string    | Surface headword (display casing preserved)                      | entry.lemma      |
| `lang_code`          | string    | ISO 639 language code — the **authoritative language filter**    | language filter  |
| `lang`               | string    | Human language name                                              | audit only       |
| `pos`                | string    | Wiktionary POS label (`noun`, `verb`, `adj`, `adv`, ...)         | entry/sense POS  |
| `senses[]`           | array     | Sense objects                                                    | senses           |
| `senses[].glosses`   | array[str]| Definition gloss(es); usually 1 element                          | sense.definition |
| `senses[].raw_glosses`| array[str]| Gloss prefixed with grammar tags e.g. `(countable) A ...`        | audit quality    |
| `senses[].tags`      | array[str]| Grammar/dialect tags (`countable`, `uncountable`, `slang`, ...)  | sense metadata   |
| `senses[].examples`  | array     | Example sentences (fields: `text`, `type`, `ref`, `bold_text_offsets`) | example sentences |
| `senses[].senseid`   | string    | Optional textual sense id (e.g. `en:unconstrained, socially`)     | provenance hint  |
| `senses[].wikidata`  | string    | Optional Wikidata QID                                               | provenance hint  |
| `senses[].links`     | array     | Link terms to other lemma/POS references                          | not imported     |
| `senses[].topics`    | array     | Topic tags (e.g. `gambling`, `music`)                             | categories later |
| `senses[].categories`| array     | Wiktionary category names                                          | not imported     |
| `flex`/`inflection`  | —         | not uniformly present; ignored                                     | —                |
| `translations[]`     | array     | Translations to many languages (**top level**, NOT inside senses) | Polish extraction |
| `forms[]`            | array     | Inflected forms (`form` + `tags`), e.g. `banks`, plural           | lemma detection  |
| `sounds[]`           | array     | Pronunciation/IPA/audio                                            | not used Phase 1 |
| `etymology_text`     | string    | Etymology narrative (long)                                        | not used Phase 1 |
| `synonyms[]/hypernyms[]/hyponyms[]/coordinate_terms[]` | array | sparse term links | not primary source for relationships |

### Translation object structure

Each element of `translations[]`:

```json
{
  "lang": "Polish",
  "code": "pl",
  "lang_code": "pl",
  "sense": "branch office",
  "word": "bank",
  "tags": ["inanimate", "masculine"],
  "roman": "(optional)",
  "alt": "(optional)"
}
```

**Critical finding:** the translation's `sense` field is a **free-text label**, not a
stable identifier. It must be matched to a sense by text similarity to the gloss
(confidence-scored). There is no guaranteed 1:1 index alignment between
`senses[]` order and `translations[]` order.

### Sense identifiers

Wiktextract senses have **no stable machine-readable id** in most records. Present in
some records only:

* `senseid` — human-editable text id
* `wikidata` — Wikidata entity id (sparse)
* `links` — internal references

### Missing / null behaviour

* `glosses` and `raw_glosses` are normally present but can be empty arrays.
* `examples` may be empty or absent.
* `translations[]` is often empty or absent (especially for function words).
* Polish (pl) translations are present on a subset of records.
* Some records have `forms[]` with lemma-equal forms (`'form': 'bank'`).

### Duplicate behaviour

* A word+POS may appear in multiple records (separate etymologies). Records must be
  merged into a single canonical entry on (normalized lemma + canonical POS).
* Same gloss may repeat across etymologies → sense-dedup by (lemma, POS, normalized gloss).
* `mul` language records (e.g. characters) are not English and are excluded by
  `lang_code == "en"` filter.

### Risks

* **24.7 GB** — must be processed with streaming, never `json.load(whole_file)`.
* Translation→sense linkage has no stable key; matcher must tolerate fuzziness.
* Some sense glosses are near-duplicates (e.g. `bank` noun has two "fund" senses that
  differ only by context) — dedup must not silently merge meaningful distinctions.
* Value entropy is high; quality validation and reports are essential.

---

## 2. CEFR-J Vocabulary Profile — `cefrj-vocabulary-profile-1.5.csv`

### File facts

| Property           | Value |
|--------------------|-------|
| Path               | `cefrj-vocabulary-profile-1.5.csv` |
| Format             | CSV, no quoting of simple fields (quoted only when commas present) |
| Encoding           | UTF-8 (viewed) |
| Compression        | None |
| Size               | 233,214 bytes |
| Data rows          | 7,799 |
| Header row         | `headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold` |

### Record structure

```csv
headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold
a,determiner,A1,,,
abandon,verb,B1,,,
above,adjective,B1,,,
above,adverb,A1,,,
above,preposition,A1,,,
```

### Field semantics

| Field               | Description                                                        | Used               |
|---------------------|--------------------------------------------------------------------|--------------------|
| `headword`          | Word/phrase surface form. May be multi-word (`a.m./A.M./am/AM`, `according to`), may contain `;` variants. Display casing preserved. | entry.lemma        |
| `pos`               | J-CEFR POS label (`noun`, `verb`, `adjective`, `adverb`, `determiner`, `preposition`, `conjunction`, `pronoun`, `intj`, `phr`, `num`, `mod`, `beam`) | entry/sense POS    |
| `CEFR`              | Level in `A1, A2, B1, B2`                                          | CEFR assignment    |
| `CoreInventory 1`   | Topic inventory label (sparse, mostly empty), e.g. `Nationalities and countries`, `Education` | stored; taxonomy later |
| `CoreInventory 2`   | Second topic inventory (mostly empty)                              | stored; taxonomy later |
| `Threshold`         | Topic domain label (sparse, mostly empty)                          | stored; taxonomy later |

### Entity granularity

* **Word + POS level.** This dataset does **NOT** distinguish senses.
* A headword with multiple POS values has multiple rows (847 headwords have 2–5 rows),
  e.g. `round` has 5 rows (adjective/adverb/noun/verb/preposition), each with its own
  level.

### Duplicate behaviour

* Duplicates only occur as headword × POS combos. No full duplicate rows observed.
* Level distribution: `B2: 2778, B1: 2446, A2: 1411, A1: 1164` (7,799 rows).

### Missing / null behaviour

* `CoreInventory 1`, `CoreInventory 2`, `Threshold` are empty for most rows.
* Empty rows/blank lines were not observed within data.

### Matching strategy

* Match on **(normalized lemma + canonical POS)** → confidence **HIGH** at entry level.
* Propagate to senses of that entry at sense level with `match_method = pos+lemma`
  and confidence **MEDIUM** (see reconciliation doc).
* Where the headword contains `;` variants or multi-word phrases, normalized variants
  are each attempted against canonical entries.

### Risks

* Word-level CEFR must NOT be auto-applied as certain sense-level confidence.
* POS vocabulary diverges slightly from Wiktextract (`intj` vs `intj`, `phr` vs
  `phrase`) — requires POS normalization mapping.

---

## 3. Octanove C1/C2 Vocabulary Profile — `octanove-vocabulary-profile-c1c2-1.0.csv`

### File facts

| Property           | Value |
|--------------------|-------|
| Path               | `octanove-vocabulary-profile-c1c2-1.0.csv` |
| Format             | CSV |
| Encoding           | UTF-8 (viewed) |
| Compression        | None |
| Size               | 46,462 bytes |
| Data rows          | 2,136 |
| Header row         | `headword,pos,CEFR,notes` |

### Record structure

```csv
headword,pos,CEFR,notes
exterior,noun,C1,
cloak,noun,C1,
cast,noun,C1,"plaster cast, mold"
cast,verb,C1,hire actors
cast,verb,C1,say or suggest something (e.g. doubt)
```

### Field semantics

| Field               | Description                                                        | Used               |
|---------------------|--------------------------------------------------------------------|--------------------|
| `headword`          | Word/phrase surface form; `;` variants possible (`maneuver/manoeuvre`) | entry.lemma        |
| `pos`               | POS label (`noun`, `verb`, `adjective`, `adverb`, ...)             | entry/sense POS    |
| `CEFR`              | Level in `C1, C2`                                                  | CEFR assignment    |
| `notes`             | Optional sense disambiguation hint (not always present)            | sense matching evidence, quality |

### Entity granularity

* **Word + POS level**, with occasional **sense hints** in `notes`.
* 163 headwords have multiple rows (same word, different POS → different levels).

### Notable observations

* `commission` appears twice as `noun` (`C1` and `C2` in separate rows) → internal
  conflict to be reported, not silently resolved.
* `eccentric` appears twice as `adjective C1` → exact duplicates to dedup/report.
* `swap` appears as `verb C1` twice (identical) → duplicate rows.
* `enviable` is tagged `adverb` but is actually an adjective in standard English — a
  data-quality note for review.

### Matching strategy

* Same as CEFR-J: **(normalized lemma + canonical POS)** + optional `notes`-based
  gloss affinity → confidence variants.
* C1/C2 data intentionally checked with a **different source precedence** than A1–B2.

---

## 4. Open English WordNet 2025 — `english-wordnet-2025-json/`

### File facts

| Property           | Value |
|--------------------|-------|
| Path               | `english-wordnet-2025-json/` |
| Format             | Projected JSON (WordNet ontology) |
| Encoding           | UTF-8 |
| Compression        | None |
| Total files        | 73 |
| Entries files      | 27 (`entries-<letter>.json`, one file per initial letter; `entries-0.json` for digits) |
| Synset files       | 44 (`noun.*.json` x 30, `verb.*.json` x 15, `adj.*.json` x 3, `adv.*.json` x 1) |
| Auxiliary files    | `frames.json` (verb frames), `adj.ppl.json`, `adj.pert.json` |
| Entry count        | 128,009 unique (lemma, POS) pairs |
| Sense count        | 185,129 sense entries (each sense has an id + synset reference) |
| Synset count       | 107,519 |

### `entries-*.json` structure

```json
{
  "B battery": {
    "n": {
      "sense": [
        { "id": "b_battery%1:06:00::", "synset": "02817116-n" }
      ]
    }
  },
  "bank": {
    "n": { "sense": [ { "id": "bank%1:17:01::", "synset": "09236472-n" }, ... ] },
    "v": { "sense": [ { "id": "bank%2:40:00::", "synset": "02315835-v" }, ... ] }
  }
}
```

Sense objects may also carry: `derivation[]`, `subcat[]`, `sent[]` (example sentence),
`agent[]`, `location[]`, `uses[]`, `event[]`.

Key facts:

* Sense ID format: `<lemma_with_underscores>%<wpos>:<lexicographer_file>:<id>::` where
  `wpos` is `1` noun, `2` verb, `3` adj, `4` adv, `5` adj-satellite.
* The `synset` field links the sense to a synset file id (`NNNNNNNN-n`/`-v`/`-a`/`-r`).
* POS types observed: `n`, `v`, `a`, `s` (adjective satellite), `r` and homograph
  variants `n-1`, `n-2`, `v-1`, `v-2`, `a-1`, `a-2`.
* Headwords preserve display casing (`B vitamin`); lemmas in sense ids are the
  canonical lowercase-with-underscores form.
* Some headwords contain multiple space-separated words (collocations).

### Synset files structure

```json
"09236472-n": {
  "definition": ["sloping land (especially the slope beside a body of water)"],
  "example": ["they pulled the canoe up on the bank"],
  "hypernym": ["09460358-n"],
  "ili": "i85041",
  "members": ["bank"],
  "partOfSpeech": "n",
  "wikidata": "Q22687"
}
```

Field inventory (union of observed keys):

| Field              | Type              | Meaning                                          | Imported |
|--------------------|-------------------|--------------------------------------------------|----------|
| `id` (key)         | string            | Synset id `<8 digits>-{n,v,a,r,s}`               | yes (`synset_id`) |
| `definition`       | array[str]        | Gloss; usually 1 element                        | yes      |
| `members`          | array[str]        | Member lemmas (multi-word possible)              | yes (members table plan) |
| `partOfSpeech`     | string            | `n`, `v`, `a`, `r`, `s`                          | yes      |
| `hypernym`         | array[str]        | Hypernym synset ids                              | yes      |
| `hyponym`          | —                 | not present in files reviewed (hypernym is inverse) | —      |
| `example`          | array[str]        | Example sentences                                | yes      |
| `mero_part`        | array[str]        | Meronym part-of synsets                          | yes      |
| `mero_member`      | array[str]        | Member meronym synsets                           | yes      |
| `mero_substance`   | array[str]        | Substance meronym synsets                        | yes      |
| `similar`          | array[str]        | Similar-to synsets (adjectives)                  | yes      |
| `also`             | array[str]        | Also-see synsets                                 | yes      |
| `attribute`        | array[str]        | Attribute-of synsets                             | yes      |
| `entails`          | array[str]        | Entails synsets (verbs)                          | yes      |
| `causes`           | array[str]        | Causes synsets (verbs)                           | yes      |
| `domain_topic`     | array[str]        | Domain topic synsets                             | yes      |
| `domain_region`    | array[str]        | Domain region synsets                            | yes      |
| `exemplifies`      | array[str]        | Region/location examples                         | yes      |
| `source`           | array[str]        | Source lexicon                                  | audit only |
| `ili`              | string            | Interlingual Index id (`iNNNNN`)                 | provenance |
| `wikidata`         | string            | Wikidata QID (sparse)                            | provenance |

### Entity granularity

* **Sense level** natively. Each entry maps to synsets; each synset carries a gloss.
* Relationships are **synset-to-synset** (not word-to-word).

### Matching strategy

Wiktextract senses are matched to WordNet synsets by:
1. lemma + POS (entry alignment);
2. gloss similarity between Wiktextract sense gloss and synset definition;
3. a confidence threshold; below threshold → **UNMATCHED** (never guessed).

### Risks

* Some synsets contain many members (`count, bet, depend, swear, rely, bank, look,
  calculate, reckon`) → synonyms from synset membership must be attributed to the
  *synset*, then sense-mapped with caution.
* No antonym relation file observed; antonyms may be absent → do not fabricate.

---

## 5. NGSL 1.2 — `NGSL_1.2_stats.csv`

### File facts

| Property           | Value |
|--------------------|-------|
| Path               | `NGSL_1.2_stats.csv` |
| Format             | CSV |
| Encoding           | UTF-8 |
| Compression        | None |
| Size               | 62,566 bytes |
| Data rows          | 2,809 |
| Header row         | `Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)` |

### Record structure

```csv
Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)
the,1,87.85,60910
be,2,86.86,48575
insure,2805,49.65,9
thirst,2809,44.79,3
```

### Field semantics

| Field                              | Description                                              | Used          |
|------------------------------------|----------------------------------------------------------|---------------|
| `Lemma`                            | Canonical lowercase lemma (all lemmas in modern lowercase except `I`, `TRUE`, `FALSE`) | entry.lemma    |
| `SFI Rank`                         | Rank 1..2809 (standard frequency index rank)             | frequency.rank|
| `SFI`                              | Standard frequency index (log-scaled score)              | frequency.sfi |
| `Adjusted Frequency per Million (U)`| raw frequency stat per million                           | frequency.u   |

### Entity granularity

* **Word / lemma level.** No POS, no senses, no variants beyond the lemma itself.
* No multi-word entries observed (`' '` count = 0).

### Missing / null behaviour

* No NULLs observed in the four columns.
* Non-ASCII or non-lowercase: only `I`, `TRUE`, `FALSE`.

### Risks

* `TRUE`, `FALSE`, `I` are capitalized lemmas — normalizing to lowercase conflicts
  with the surface form of the entry; keep a **lowercase matching key** and a display
  lemma.
* Frequency is lemma-level; it must not be diffused to senses as if it were per-sense.

---

## Cross-dataset summary

| Aspect            | Wiktextract | CEFR-J | Octanove | WordNet | NGSL |
|-------------------|-------------|--------|----------|---------|------|
| Format            | JSONL       | CSV    | CSV      | JSON    | CSV  |
| Size              | 24.7 GB     | 233 KB | 46 KB    | ~48 MB (73 files) | 63 KB |
| Granularity       | word+POS, senses | word+POS | word+POS (+notes) | sense+synset | lemma |
| A1–B2 CEFR        | —           | ✓ (A1..B2) | —      | —       | —    |
| C1–C2 CEFR        | —           | —      | ✓ (C1..C2) | —     | —    |
| Polish translations | ✓ (conflict-prone linkage) | — | — | — | — |
| Synonyms/relations | sparse      | —      | —        | ✓ rich  | —    |
| Frequency         | —           | —      | —        | —       | ✓ rank/SFI/U |
| Stable sense ids  | ✗ (sparse)  | ✗      | ✗ (notes) | ✓ (sense ids + synsets) | ✗ |
| License metadata  | not in file | not in file | not in file | partial (OWL attribution not embedded in JSON) | not in file |

License status for every source: **must be verified** (no license metadata is embedded
in the supplied files). See `docs/vocabulary-sources.md`.

## Extraction plan (from real evidence)

1. Filter Wiktextract by `lang_code == "en"`.
2. Canonical entry key: `(normalized_lemma, canonical_pos)`.
3. Build senses from `senses[].glosses` (first gloss as definition; keep raw gloss).
4. Attach Polish translations via confidence-scored sense-label→gloss matching.
5. CEFR-J/Octanove: match at entry level via `(lemma, POS)`; propagate to senses with
   documented confidence; report conflicts.
6. WordNet: match senses to synsets via gloss similarity + lemma/POS alignment.
7. NGSL: attach lemma-level rank/SFI/U to entries; never fan-out to senses.
8. Provenance recorded for every merged field.

## Open questions / risks to confirm before full run

1. License confirmation required for all five sources (no license embedded).
2. Whether Wiktextract snapshot has a published date for version pinning.
3. `en` vs `enm` (Middle English): `enm` records are excluded (lang_code filter is strict
   `en`).
4. Bank senses: the river-bank sense lives in a *different etymology record* than the
   financial senses → merging on `(lemma, POS)` across records is mandatory, and the
   golden test must prove both senses survive that merge.