CREATE TYPE activity_link_type AS ENUM ('PERMANENT', 'EXPIRING', 'SINGLE_USE');

CREATE TABLE IF NOT EXISTS activity_access_tokens (
    id            BIGSERIAL PRIMARY KEY,
    activity_id   BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    token_hash    TEXT NOT NULL UNIQUE,
    token_prefix  TEXT NOT NULL,
    link_type     activity_link_type NOT NULL DEFAULT 'PERMANENT',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at    TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    consumed_at   TIMESTAMPTZ,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_access_tokens_activity
    ON activity_access_tokens (activity_id);
