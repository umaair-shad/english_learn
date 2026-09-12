-- 005_activity_core.sql
-- Shared activity infrastructure: definitions, items, sessions and a
-- standardized event system. Activities are delivery mechanisms -- long-term
-- learning state stays owned by student_vocabulary_states (FSRS).

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('FLASHCARDS', 'MEMORY', 'QUIZ', 'FILL_BLANK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_event_type AS ENUM (
    'ACTIVITY_STARTED',
    'CARD_SHOWN',
    'ANSWER_SUBMITTED',
    'ANSWER_CORRECT',
    'ANSWER_INCORRECT',
    'MATCH_FOUND',
    'MATCH_FAILED',
    'QUESTION_COMPLETED',
    'PAUSED',
    'RESUMED',
    'FINISHED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Activities (teacher-owned definitions, optionally bound to an assignment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id            bigint NOT NULL REFERENCES teacher_accounts(id),
  student_id            bigint NOT NULL REFERENCES students(id)   ON DELETE CASCADE,
  assignment_id         bigint REFERENCES assignments(id)         ON DELETE SET NULL,
  title                 text NOT NULL,
  description           text,
  activity_type         activity_type NOT NULL,
  status                activity_status NOT NULL DEFAULT 'DRAFT',
  settings              jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_student_idx      ON activities (student_id);
CREATE INDEX IF NOT EXISTS activities_assignment_idx   ON activities (assignment_id);
CREATE INDEX IF NOT EXISTS activities_status_idx       ON activities (status);
CREATE INDEX IF NOT EXISTS activities_type_idx         ON activities (activity_type);
CREATE INDEX IF NOT EXISTS activities_teacher_idx      ON activities (teacher_id);

CREATE TABLE IF NOT EXISTS activity_items (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id         bigint NOT NULL REFERENCES activities(id)       ON DELETE CASCADE,
  vocabulary_sense_id bigint NOT NULL REFERENCES vocabulary_senses(id) ON DELETE CASCADE,
  position            integer NOT NULL,
  settings            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_items_activity_sense_key UNIQUE (activity_id, vocabulary_sense_id)
);

CREATE INDEX IF NOT EXISTS activity_items_activity_idx ON activity_items (activity_id);
CREATE INDEX IF NOT EXISTS activity_items_sense_idx    ON activity_items (vocabulary_sense_id);

-- ---------------------------------------------------------------------------
-- Activity sessions (per student run of an activity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_sessions (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id        bigint NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  student_id         bigint NOT NULL REFERENCES students(id)   ON DELETE CASCADE,
  started_at         timestamptz NOT NULL DEFAULT now(),
  last_activity_at   timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  paused_at          timestamptz,
  status             session_status NOT NULL DEFAULT 'ACTIVE',
  current_item_index integer,
  total_items        integer NOT NULL DEFAULT 0,
  correct_count      integer NOT NULL DEFAULT 0,
  incorrect_count    integer NOT NULL DEFAULT 0,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_sessions_activity_idx    ON activity_sessions (activity_id);
CREATE INDEX IF NOT EXISTS activity_sessions_student_idx     ON activity_sessions (student_id);
CREATE INDEX IF NOT EXISTS activity_sessions_status_idx      ON activity_sessions (status);
CREATE INDEX IF NOT EXISTS activity_sessions_last_activity   ON activity_sessions (last_activity_at);

-- ---------------------------------------------------------------------------
-- Activity events (append-only standardized event stream)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_events (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id          bigint NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
  activity_id         bigint NOT NULL REFERENCES activities(id)        ON DELETE CASCADE,
  student_id          bigint NOT NULL REFERENCES students(id)          ON DELETE CASCADE,
  vocabulary_sense_id bigint REFERENCES vocabulary_senses(id)          ON DELETE SET NULL,
  event_type          activity_event_type NOT NULL,
  direction           varchar(32),
  response            text,
  is_correct          boolean,
  response_time_ms    integer,
  metadata            jsonb,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_session_time_idx   ON activity_events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS activity_events_student_time_idx   ON activity_events (student_id, occurred_at);
CREATE INDEX IF NOT EXISTS activity_events_sense_idx          ON activity_events (vocabulary_sense_id);