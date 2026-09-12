-- 003_learning_state.sql
-- Student vocabulary learning state + immune review history (FSRS core)
-- Sense-centric: every row references vocabulary_senses.id, NOT vocabulary_entries.id.

-- Learning status enum (sparse: only for assigned/encountered/reviewed/overridden senses)
DO $$ BEGIN
  CREATE TYPE learning_status AS ENUM
    ('ASSIGNED', 'ENCOUNTERED', 'LEARNING', 'REVIEWING', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Review rating enum (normalized FSRS rating)
DO $$ BEGIN
  CREATE TYPE review_rating AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One row per (student, vocabulary_sense). Sparse by design.
CREATE TABLE IF NOT EXISTS student_vocabulary_states (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id           bigint NOT NULL REFERENCES students(id)            ON DELETE CASCADE,
  vocabulary_sense_id  bigint NOT NULL REFERENCES vocabulary_senses(id)   ON DELETE CASCADE,
  status               learning_status NOT NULL DEFAULT 'ASSIGNED',
  first_encountered_at timestamptz,
  first_learned_at     timestamptz,
  last_reviewed_at     timestamptz,
  next_review_at       timestamptz,
  review_count         integer NOT NULL DEFAULT 0,
  correct_count        integer NOT NULL DEFAULT 0,
  incorrect_count      integer NOT NULL DEFAULT 0,
  difficulty           double precision,
  stability            double precision,
  retrievability       double precision,
  fsrs_state           jsonb,
  lapses               integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_vocabulary_states_counts_check
    CHECK (review_count >= 0 AND correct_count >= 0 AND incorrect_count >= 0 AND lapses >= 0),
  CONSTRAINT student_vocabulary_states_student_sense_key UNIQUE (student_id, vocabulary_sense_id)
);

CREATE INDEX IF NOT EXISTS student_vocabulary_states_student_status_idx
  ON student_vocabulary_states (student_id, status);
CREATE INDEX IF NOT EXISTS student_vocabulary_states_student_next_review_idx
  ON student_vocabulary_states (student_id, next_review_at);
CREATE INDEX IF NOT EXISTS student_vocabulary_states_sense_idx
  ON student_vocabulary_states (vocabulary_sense_id);

-- Immutable append-only review history. rating is NULL for teacher overrides.
CREATE TABLE IF NOT EXISTS vocabulary_review_history (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id                bigint NOT NULL REFERENCES students(id)            ON DELETE CASCADE,
  vocabulary_sense_id       bigint NOT NULL REFERENCES vocabulary_senses(id)   ON DELETE CASCADE,
  student_vocabulary_state_id bigint NOT NULL REFERENCES student_vocabulary_states(id) ON DELETE CASCADE,
  rating                    review_rating,
  response_time_ms          integer,
  previous_status           learning_status NOT NULL,
  new_status                learning_status NOT NULL,
  previous_difficulty       double precision,
  new_difficulty            double precision,
  previous_stability        double precision,
  new_stability             double precision,
  previous_next_review_at   timestamptz,
  next_review_at            timestamptz,
  source_type               varchar(32) NOT NULL DEFAULT 'manual',
  source_id                 bigint,
  reviewed_at               timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vocabulary_review_history_student_sense_idx
  ON vocabulary_review_history (student_id, vocabulary_sense_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS vocabulary_review_history_state_idx
  ON vocabulary_review_history (student_vocabulary_state_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS vocabulary_review_history_sense_idx
  ON vocabulary_review_history (vocabulary_sense_id);