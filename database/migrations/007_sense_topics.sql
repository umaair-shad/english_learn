CREATE TABLE IF NOT EXISTS sense_topics (
    id                    BIGSERIAL PRIMARY KEY,
    vocabulary_sense_id   BIGINT NOT NULL REFERENCES vocabulary_senses(id),
    topic                 VARCHAR(128) NOT NULL,
    source                VARCHAR(32) NOT NULL,
    UNIQUE (vocabulary_sense_id, topic, source)
);

CREATE INDEX IF NOT EXISTS idx_sense_topics_sense
    ON sense_topics (vocabulary_sense_id);

CREATE INDEX IF NOT EXISTS idx_sense_topics_topic
    ON sense_topics (topic);
