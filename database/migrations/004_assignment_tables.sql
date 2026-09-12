-- 004_assignment_tables.sql
-- Teacher-managed reusable vocabulary sets + student assignments.
-- Learning state remains owned by (student, vocabulary_sense) -- assignments never
-- duplicate or reset that state; they reference it for progress.

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM
    ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_source_type AS ENUM ('MANUAL', 'VOCABULARY_SET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Vocabulary sets (reusable collections of SENSES)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary_sets (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                 text NOT NULL,
  description          text,
  is_active            boolean NOT NULL DEFAULT TRUE,
  created_by_teacher_id bigint REFERENCES teacher_accounts(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vocabulary_sets_created_by_idx
  ON vocabulary_sets (created_by_teacher_id);
CREATE INDEX IF NOT EXISTS vocabulary_sets_name_idx
  ON vocabulary_sets (name);

CREATE TABLE IF NOT EXISTS vocabulary_set_items (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vocabulary_set_id   bigint NOT NULL REFERENCES vocabulary_sets(id)       ON DELETE CASCADE,
  vocabulary_sense_id bigint NOT NULL REFERENCES vocabulary_senses(id)     ON DELETE CASCADE,
  position            integer,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vocabulary_set_items_set_sense_key UNIQUE (vocabulary_set_id, vocabulary_sense_id)
);

CREATE INDEX IF NOT EXISTS vocabulary_set_items_sense_idx
  ON vocabulary_set_items (vocabulary_sense_id);

-- ---------------------------------------------------------------------------
-- Assignments (student-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id            bigint NOT NULL REFERENCES students(id)            ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text,
  status                assignment_status NOT NULL DEFAULT 'DRAFT',
  assigned_at           timestamptz,
  due_at                timestamptz,
  completed_at          timestamptz,
  created_by_teacher_id bigint REFERENCES teacher_accounts(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_student_status_idx
  ON assignments (student_id, status);
CREATE INDEX IF NOT EXISTS assignments_student_due_idx
  ON assignments (student_id, due_at);

CREATE TABLE IF NOT EXISTS assignment_items (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id       bigint NOT NULL REFERENCES assignments(id)          ON DELETE CASCADE,
  vocabulary_sense_id bigint NOT NULL REFERENCES vocabulary_senses(id)    ON DELETE CASCADE,
  source_type         assignment_source_type NOT NULL DEFAULT 'MANUAL',
  source_set_id       bigint REFERENCES vocabulary_sets(id)               ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignment_items_assignment_sense_key UNIQUE (assignment_id, vocabulary_sense_id)
);

CREATE INDEX IF NOT EXISTS assignment_items_sense_idx
  ON assignment_items (vocabulary_sense_id);
CREATE INDEX IF NOT EXISTS assignment_items_set_idx
  ON assignment_items (source_set_id);