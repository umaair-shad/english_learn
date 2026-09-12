-- Milestone 2 application schema: teacher auth + student management + private access tokens.
-- Adds app tables only; vocabulary pipeline tables are intentionally untouched.

CREATE TABLE IF NOT EXISTS teacher_accounts (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    display_name  TEXT        NOT NULL DEFAULT '',
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS students (
    id           BIGSERIAL PRIMARY KEY,
    first_name   TEXT        NOT NULL DEFAULT '',
    last_name    TEXT,
    display_name TEXT        NOT NULL,
    notes        TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_access_tokens (
    id           BIGSERIAL PRIMARY KEY,
    student_id   BIGINT      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    token_hash   TEXT        NOT NULL UNIQUE,
    token_prefix TEXT        NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    expires_at   TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_access_tokens_student
    ON student_access_tokens (student_id);