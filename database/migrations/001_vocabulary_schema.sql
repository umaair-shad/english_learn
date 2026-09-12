-- Phase 1 vocabulary schema (mirrors database/schema.py).
-- The NestJS migrations are the authoritative production schema; this file
-- exists so the Python pipeline can bootstrap a database for loading.

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

CREATE TABLE IF NOT EXISTS vocabulary_category_assignments (
    id                 BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    category_id        BIGINT NOT NULL REFERENCES categories(id),
    source_id          BIGINT REFERENCES vocabulary_sources(id),
    confidence         VARCHAR(16),
    UNIQUE (vocabulary_sense_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_normalized_word ON vocabulary_entries (normalized_lemma);
CREATE INDEX IF NOT EXISTS idx_senses_entry ON vocabulary_senses (vocabulary_entry_id);
CREATE INDEX IF NOT EXISTS idx_senses_pos ON vocabulary_senses (part_of_speech);
CREATE INDEX IF NOT EXISTS idx_translations_normalized_text ON translations (normalized_text);
CREATE INDEX IF NOT EXISTS idx_cefr_level ON cefr_assignments (level);
CREATE INDEX IF NOT EXISTS idx_frequency_rank ON frequency_data (rank);
CREATE INDEX IF NOT EXISTS idx_rels_source ON semantic_relationships (source_synset_id);
CREATE INDEX IF NOT EXISTS idx_rels_target ON semantic_relationships (target_synset_id);
CREATE INDEX IF NOT EXISTS idx_sense_synsets_synset ON sense_synsets (synset_id);
CREATE INDEX IF NOT EXISTS idx_quality_entity ON quality_flags (entity_type, entity_key);