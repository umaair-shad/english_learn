"""Authoritative vocabulary schema (shared with the NestJS application).

The NestJS migrations are the source of truth for production; this SQL mirrors
them so the Python loader can create temp staging tables and (optionally) the
schema when a database is being bootstrapped by the pipeline.
"""

from __future__ import annotations

VOCABULARY_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS vocabulary_sources (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL UNIQUE,
    version       VARCHAR(64),
    url           TEXT,
    license       TEXT,
    attribution   TEXT,
    imported_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocabulary_import_runs (
    id            BIGSERIAL PRIMARY KEY,
    source_id     BIGINT NOT NULL REFERENCES vocabulary_sources(id),
    fingerprint   TEXT,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    status        VARCHAR(16) NOT NULL DEFAULT 'running',
    record_count  BIGINT DEFAULT 0,
    UNIQUE (source_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS vocabulary_entries (
    id               BIGSERIAL PRIMARY KEY,
    lemma            TEXT NOT NULL,
    normalized_lemma TEXT NOT NULL,
    part_of_speech   VARCHAR(64) NOT NULL,
    language         VARCHAR(8)  NOT NULL DEFAULT 'en',
    display_form     TEXT,
    wikidata_qid     VARCHAR(32),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (normalized_lemma, part_of_speech)
);

CREATE TABLE IF NOT EXISTS vocabulary_senses (
    id                    BIGSERIAL PRIMARY KEY,
    vocabulary_entry_id   BIGINT NOT NULL REFERENCES vocabulary_entries(id),
    position              INTEGER NOT NULL,
    lemma                 TEXT NOT NULL,
    normalized_lemma      TEXT NOT NULL,
    part_of_speech        VARCHAR(64) NOT NULL,
    definition            TEXT NOT NULL,
    normalized_definition TEXT NOT NULL,
    raw_definition        TEXT,
    tags                  TEXT[],
    sense_id_hint         TEXT,
    wikidata_qid          VARCHAR(32),
    source_record_id      TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vocabulary_entry_id, position)
);

CREATE TABLE IF NOT EXISTS translations (
    id               BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    language         VARCHAR(8) NOT NULL DEFAULT 'pl',
    text             TEXT NOT NULL,
    normalized_text  TEXT NOT NULL,
    sense_label      TEXT,
    match_method     VARCHAR(32),
    match_confidence VARCHAR(16),
    UNIQUE (vocabulary_sense_id, language, normalized_text)
);

CREATE TABLE IF NOT EXISTS example_sentences (
    id               BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    text             TEXT NOT NULL,
    source           VARCHAR(32) NOT NULL DEFAULT 'wiktextract',
    verification     TEXT,
    UNIQUE (vocabulary_sense_id, text)
);

CREATE TABLE IF NOT EXISTS cefr_assignments (
    id                BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    level             VARCHAR(4) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    source_id         BIGINT NOT NULL REFERENCES vocabulary_sources(id),
    match_method      VARCHAR(64) NOT NULL,
    confidence        VARCHAR(16) NOT NULL,
    requires_review   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (vocabulary_sense_id, source_id, level)
);

CREATE TABLE IF NOT EXISTS frequency_data (
    id                     BIGSERIAL PRIMARY KEY,
    vocabulary_entry_id    BIGINT NOT NULL REFERENCES vocabulary_entries(id),
    rank                   INTEGER,
    sfi                    NUMERIC(6,2),
    frequency_per_million  NUMERIC(12,2),
    source_id              BIGINT NOT NULL REFERENCES vocabulary_sources(id),
    UNIQUE (vocabulary_entry_id, source_id)
);

CREATE TABLE IF NOT EXISTS wordnet_synsets (
    id          BIGSERIAL PRIMARY KEY,
    synset_id   VARCHAR(24) NOT NULL UNIQUE,
    part_of_speech VARCHAR(16) NOT NULL,
    definition  TEXT NOT NULL,
    members     TEXT[] NOT NULL DEFAULT '{}',
    ili         VARCHAR(16),
    wikidata_qid TEXT,
    source_id   BIGINT NOT NULL REFERENCES vocabulary_sources(id)
);

CREATE TABLE IF NOT EXISTS sense_synsets (
    id                 BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    synset_id          VARCHAR(24) NOT NULL REFERENCES wordnet_synsets(synset_id),
    match_method       VARCHAR(64) NOT NULL,
    confidence         VARCHAR(16) NOT NULL,
    score              NUMERIC(5,3),
    UNIQUE (vocabulary_sense_id, synset_id)
);

CREATE TABLE IF NOT EXISTS semantic_relationships (
    id               BIGSERIAL PRIMARY KEY,
    source_synset_id VARCHAR(24) NOT NULL REFERENCES wordnet_synsets(synset_id),
    relationship_type VARCHAR(32) NOT NULL,
    target_synset_id VARCHAR(24) NOT NULL REFERENCES wordnet_synsets(synset_id),
    source_id        BIGINT NOT NULL REFERENCES vocabulary_sources(id),
    UNIQUE (source_synset_id, relationship_type, target_synset_id)
);

CREATE TABLE IF NOT EXISTS provenance_records (
    id               BIGSERIAL PRIMARY KEY,
    entity_type      VARCHAR(32) NOT NULL,
    entity_key       TEXT NOT NULL,
    field_name       VARCHAR(64) NOT NULL,
    source_id        BIGINT NOT NULL REFERENCES vocabulary_sources(id),
    source_record_id TEXT,
    match_method     VARCHAR(32),
    match_confidence VARCHAR(16),
    import_run_id    BIGINT REFERENCES vocabulary_import_runs(id),
    imported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_key, field_name, source_id, source_record_id, import_run_id)
);

CREATE TABLE IF NOT EXISTS quality_flags (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   VARCHAR(32) NOT NULL,
    entity_key    TEXT,
    issue_code    VARCHAR(64) NOT NULL,
    severity      VARCHAR(16) NOT NULL,
    message       TEXT,
    import_run_id BIGINT REFERENCES vocabulary_import_runs(id)
);

CREATE TABLE IF NOT EXISTS reconcile_conflicts (
    id              BIGSERIAL PRIMARY KEY,
    field_name      VARCHAR(32) NOT NULL,
    entity_key      TEXT NOT NULL,
    sources         TEXT[] NOT NULL,
    values          TEXT[] NOT NULL,
    resolution      TEXT NOT NULL,
    requires_review BOOLEAN NOT NULL DEFAULT TRUE,
    import_run_id   BIGINT REFERENCES vocabulary_import_runs(id),
    UNIQUE (field_name, entity_key, resolution, import_run_id)
);

CREATE TABLE IF NOT EXISTS categories (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(64) NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    parent_id   BIGINT REFERENCES categories(id)
);

-- Future taxonomy assignment table (extension point).
CREATE TABLE IF NOT EXISTS vocabulary_category_assignments (
    id                 BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    category_id        BIGINT NOT NULL REFERENCES categories(id),
    source_id          BIGINT REFERENCES vocabulary_sources(id),
    confidence         VARCHAR(16),
    UNIQUE (vocabulary_sense_id, category_id)
);
"""

INDEXES_SQL = """
CREATE INDEX IF NOT EXISTS idx_entries_normalized_word
    ON vocabulary_entries (normalized_lemma);
CREATE INDEX IF NOT EXISTS idx_senses_entry
    ON vocabulary_senses (vocabulary_entry_id);
CREATE INDEX IF NOT EXISTS idx_senses_pos
    ON vocabulary_senses (part_of_speech);
CREATE INDEX IF NOT EXISTS idx_translations_normalized_text
    ON translations (normalized_text);
CREATE INDEX IF NOT EXISTS idx_cefr_level
    ON cefr_assignments (level);
CREATE INDEX IF NOT EXISTS idx_frequency_rank
    ON frequency_data (rank);
CREATE INDEX IF NOT EXISTS idx_rels_source
    ON semantic_relationships (source_synset_id);
CREATE INDEX IF NOT EXISTS idx_rels_target
    ON semantic_relationships (target_synset_id);
CREATE INDEX IF NOT EXISTS idx_sense_synsets_synset
    ON sense_synsets (synset_id);
CREATE INDEX IF NOT EXISTS idx_quality_entity
    ON quality_flags (entity_type, entity_key);
"""

STAGING_TABLES_SQL = """
CREATE TEMP TABLE stage_entries (
    lemma TEXT, normalized_lemma TEXT, part_of_speech TEXT, language TEXT,
    display_form TEXT, wikidata_qid TEXT
);
CREATE TEMP TABLE stage_senses (
    normalized_lemma TEXT, part_of_speech TEXT, position INTEGER, lemma TEXT,
    definition TEXT, normalized_definition TEXT, raw_definition TEXT,
    tags_json TEXT, sense_id_hint TEXT, wikidata_qid TEXT, source_record_id TEXT
);
CREATE TEMP TABLE stage_translations (
    normalized_lemma TEXT, part_of_speech TEXT, sense_position INTEGER,
    language TEXT, text TEXT, normalized_text TEXT, sense_label TEXT,
    match_method TEXT, match_confidence TEXT
);
CREATE TEMP TABLE stage_examples (
    normalized_lemma TEXT, part_of_speech TEXT, sense_position INTEGER,
    text TEXT, source TEXT, verification TEXT
);
CREATE TEMP TABLE stage_cefr (
    normalized_lemma TEXT, part_of_speech TEXT, sense_position INTEGER,
    level TEXT, source TEXT, source_version TEXT,
    match_method TEXT, confidence TEXT, requires_review BOOLEAN
);
CREATE TEMP TABLE stage_frequency (
    normalized_lemma TEXT, rank INTEGER, sfi NUMERIC, u NUMERIC
);
CREATE TEMP TABLE stage_synsets (
    synset_id TEXT, part_of_speech TEXT, definition TEXT,
    members_json TEXT, ili TEXT, wikidata_qid TEXT
);
CREATE TEMP TABLE stage_sense_synsets (
    normalized_lemma TEXT, part_of_speech TEXT, sense_position INTEGER,
    synset_id TEXT, match_method TEXT, confidence TEXT, score NUMERIC
);
CREATE TEMP TABLE stage_rels (
    source_synset_id TEXT, relationship_type TEXT, target_synset_id TEXT
);
CREATE TEMP TABLE stage_conflicts (
    field_name TEXT, entity_key TEXT, sources_json TEXT,
    values_json TEXT, resolution TEXT, requires_review BOOLEAN
);
CREATE TEMP TABLE stage_provenance (
    entity_type TEXT, entity_key TEXT, field_name TEXT, source TEXT,
    source_version TEXT, source_record_id TEXT, match_method TEXT, match_confidence TEXT
);
CREATE TEMP TABLE stage_quality (
    entity_type TEXT, entity_key TEXT, issue_code TEXT, severity TEXT, message TEXT
);
"""

MERGES_SQL = """
INSERT INTO vocabulary_entries (lemma, normalized_lemma, part_of_speech, language, display_form, wikidata_qid)
SELECT DISTINCT lemma, normalized_lemma, part_of_speech, language, display_form, NULLIF(wikidata_qid, '')
FROM stage_entries
ON CONFLICT (normalized_lemma, part_of_speech) DO NOTHING;

INSERT INTO vocabulary_senses
    (vocabulary_entry_id, position, lemma, normalized_lemma, part_of_speech,
     definition, normalized_definition, raw_definition, tags,
     sense_id_hint, wikidata_qid, source_record_id)
SELECT e.id, s.position, s.lemma, s.normalized_lemma, s.part_of_speech,
       s.definition, s.normalized_definition, s.raw_definition,
       string_to_array(NULLIF(s.tags_json, ''), '|'),
       NULLIF(s.sense_id_hint, ''), NULLIF(s.wikidata_qid, ''), s.source_record_id
FROM stage_senses s
JOIN vocabulary_entries e
  ON e.normalized_lemma = s.normalized_lemma AND e.part_of_speech = s.part_of_speech
ON CONFLICT (vocabulary_entry_id, position) DO NOTHING;

INSERT INTO translations
    (vocabulary_sense_id, language, text, normalized_text, sense_label, match_method, match_confidence)
SELECT s.id, t.language, t.text, t.normalized_text, NULLIF(t.sense_label, ''),
       NULLIF(t.match_method, ''), NULLIF(t.match_confidence, '')
FROM stage_translations t
JOIN vocabulary_entries e
  ON e.normalized_lemma = t.normalized_lemma AND e.part_of_speech = t.part_of_speech
JOIN vocabulary_senses s
  ON s.vocabulary_entry_id = e.id AND s.position = t.sense_position
ON CONFLICT (vocabulary_sense_id, language, normalized_text) DO NOTHING;

INSERT INTO example_sentences (vocabulary_sense_id, text, source, verification)
SELECT s.id, x.text, x.source, NULLIF(x.verification, '')
FROM stage_examples x
JOIN vocabulary_entries e
  ON e.normalized_lemma = x.normalized_lemma AND e.part_of_speech = x.part_of_speech
JOIN vocabulary_senses s
  ON s.vocabulary_entry_id = e.id AND s.position = x.sense_position
ON CONFLICT (vocabulary_sense_id, text) DO NOTHING;

INSERT INTO cefr_assignments
    (vocabulary_sense_id, level, source_id, match_method, confidence, requires_review)
SELECT s.id, c.level, vs.id, c.match_method, c.confidence, c.requires_review
FROM stage_cefr c
JOIN vocabulary_entries e
  ON e.normalized_lemma = c.normalized_lemma AND e.part_of_speech = c.part_of_speech
JOIN vocabulary_senses s
  ON s.vocabulary_entry_id = e.id AND s.position = c.sense_position
JOIN vocabulary_sources vs ON vs.name = c.source
ON CONFLICT (vocabulary_sense_id, source_id, level) DO NOTHING;

INSERT INTO frequency_data (vocabulary_entry_id, rank, sfi, frequency_per_million, source_id)
SELECT e.id, f.rank, f.sfi, f.u, vs.id
FROM stage_frequency f
JOIN vocabulary_entries e ON e.normalized_lemma = f.normalized_lemma
JOIN vocabulary_sources vs ON vs.name = 'ngsl'
ON CONFLICT (vocabulary_entry_id, source_id) DO NOTHING;

INSERT INTO wordnet_synsets (synset_id, part_of_speech, definition, members, ili, wikidata_qid, source_id)
SELECT y.synset_id, y.part_of_speech, y.definition,
       COALESCE(string_to_array(NULLIF(y.members_json, ''), '|'), '{}'),
       NULLIF(y.ili, ''), NULLIF(y.wikidata_qid, ''), vs.id
FROM stage_synsets y
JOIN vocabulary_sources vs ON vs.name = 'wordnet'
ON CONFLICT (synset_id) DO NOTHING;

INSERT INTO sense_synsets (vocabulary_sense_id, synset_id, match_method, confidence, score)
SELECT s.id, m.synset_id, m.match_method, m.confidence, m.score
FROM stage_sense_synsets m
JOIN vocabulary_entries e
  ON e.normalized_lemma = m.normalized_lemma AND e.part_of_speech = m.part_of_speech
JOIN vocabulary_senses s
  ON s.vocabulary_entry_id = e.id AND s.position = m.sense_position
JOIN wordnet_synsets w ON w.synset_id = m.synset_id
ON CONFLICT (vocabulary_sense_id, synset_id) DO NOTHING;

INSERT INTO semantic_relationships (source_synset_id, relationship_type, target_synset_id, source_id)
SELECT r.source_synset_id, r.relationship_type, r.target_synset_id, vs.id
FROM stage_rels r
JOIN vocabulary_sources vs ON vs.name = 'wordnet'
ON CONFLICT (source_synset_id, relationship_type, target_synset_id) DO NOTHING;
"""

MERGE_CONFLICTS_SQL = """
INSERT INTO reconcile_conflicts (field_name, entity_key, sources, values, resolution, requires_review, import_run_id)
SELECT c.field_name, c.entity_key,
       string_to_array(NULLIF(c.sources_json, ''), '|'),
       string_to_array(NULLIF(c.values_json, ''), '|'),
       c.resolution, c.requires_review, %s
FROM stage_conflicts c
ON CONFLICT (field_name, entity_key, resolution, import_run_id) DO NOTHING;
"""

MERGE_PROVENANCE_SQL = """
INSERT INTO provenance_records
    (entity_type, entity_key, field_name, source_id, source_record_id,
     match_method, match_confidence, import_run_id)
SELECT p.entity_type, p.entity_key, p.field_name, vs.id,
       NULLIF(p.source_record_id, ''), NULLIF(p.match_method, ''),
       NULLIF(p.match_confidence, ''), %s
FROM stage_provenance p
JOIN vocabulary_sources vs ON vs.name = p.source
ON CONFLICT (entity_type, entity_key, field_name, source_id, source_record_id, import_run_id) DO NOTHING;
"""

MERGE_QUALITY_SQL = """
INSERT INTO quality_flags (entity_type, entity_key, issue_code, severity, message, import_run_id)
SELECT q.entity_type, NULLIF(q.entity_key, ''), q.issue_code, q.severity, q.message, %s
FROM stage_quality q
ON CONFLICT DO NOTHING;
"""

SOURCES_SEED_SQL = """
INSERT INTO vocabulary_sources (name, version, url, license, attribution)
VALUES
 ('wiktextract', 'kaikki-snapshot', 'https://kaikki.org/', 'License must be verified', 'Wiktextract/Kaikki contributors'),
 ('cefr_j',   '1.5',   'https://www.cefrj.jp/', 'License must be verified', 'CEFR-J Vocabulary Profile authors'),
 ('octanove', '1.0',   NULL, 'License must be verified', 'Octanove C1/C2 Vocabulary Profile authors'),
 ('wordnet',  '2025',  'https://en-word.net/', 'License must be verified', 'Open English WordNet contributors'),
 ('ngsl',     '1.2',   'https://www.newgeneralservicelist.com/', 'License must be verified', 'NGSL authors')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;
"""
