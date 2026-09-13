"""Attach recovered topics to Postgres senses and retire placeholder categories."""

from __future__ import annotations

import json
from ..config import PROJECT_ROOT, Config
from ..database.postgres import connect
from ..logging import LOG

WORDNET_SKIP = {
    "sex",
    "sexual activity",
    "sexual practice",
    "sex activity",
    "ball",
    "excrement",
    "excreta",
    "excretion",
    "body waste",
    "excretory product",
}

PLACEHOLDER_SQL = r"""
DELETE FROM vocabulary_category_assignments
WHERE category_id IN (
  SELECT id FROM categories
  WHERE name ~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$'
     OR code ~ '_(BASICS|PEOPLE|PLACES|ACTIONS|THINGS|PROBLEMS|SKILLS|EVENTS)(_[1-4])?$'
     OR code IN (
       'WEATHER2','LAW2','MEDICINE2','VOLUNTEER','SEA','NUMBERS','MEASURE',
       'DIRECTION','CITYLIFE','COUNTRY','FARM','SPACE','PEACE','MATERIALS',
       'COLORS','SHAPES'
     )
);

DELETE FROM categories
WHERE name ~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$';

DELETE FROM categories
WHERE code ~ '_(BASICS|PEOPLE|PLACES|ACTIONS|THINGS|PROBLEMS|SKILLS|EVENTS)(_[1-4])?$';

DELETE FROM categories
WHERE code IN (
  'WEATHER2','LAW2','MEDICINE2','VOLUNTEER','SEA','NUMBERS','MEASURE',
  'DIRECTION','CITYLIFE','COUNTRY','FARM','SPACE','PEACE','MATERIALS',
  'COLORS','SHAPES'
);
"""


def apply_topics(cfg: Config, retire_placeholders: bool = True) -> dict:
    sidecar = cfg.staging_dir / "extract_wiktextract_topics.jsonl"
    if not sidecar.exists():
        raise FileNotFoundError(f"Run extract-topics first: missing {sidecar}")

    conn = connect(cfg.database_url)
    conn.autocommit = True
    cur = conn.cursor()
    for statement in (
        (PROJECT_ROOT / "database" / "migrations" / "007_sense_topics.sql")
        .read_text(encoding="utf-8")
        .split(";")
    ):
        sql = statement.strip()
        if sql:
            cur.execute(sql)

    cur.execute(
        """
        CREATE TEMP TABLE stage_topics (
            source_record_id TEXT,
            pos TEXT,
            sense_index INT,
            normalized_definition TEXT,
            topic TEXT,
            source TEXT
        )
        """
    )
    inserted_stage = 0
    with sidecar.open("r", encoding="utf-8") as fh:
        batch: list[tuple[str, str, int, str, str, str]] = []
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            sid = rec.get("source_record_id") or ""
            pos = rec.get("pos") or ""
            idx = int(rec.get("sense_index") or 0)
            ndef = rec.get("normalized_definition") or ""
            for topic in rec.get("topics") or []:
                batch.append((sid, pos, idx, ndef, topic, "wiktextract-topic"))
            for topic in rec.get("en_categories") or []:
                batch.append((sid, pos, idx, ndef, topic, "wiktextract-cat"))
            if len(batch) >= 5000:
                cur.executemany(
                    "INSERT INTO stage_topics VALUES (%s,%s,%s,%s,%s,%s)",
                    batch,
                )
                inserted_stage += len(batch)
                batch = []
        if batch:
            cur.executemany(
                "INSERT INTO stage_topics VALUES (%s,%s,%s,%s,%s,%s)",
                batch,
            )
            inserted_stage += len(batch)

    cur.execute(
        """
        INSERT INTO sense_topics (vocabulary_sense_id, topic, source)
        SELECT s.id, st.topic, st.source
        FROM stage_topics st
        JOIN vocabulary_senses s
          ON s.source_record_id = st.source_record_id
         AND s.normalized_definition = st.normalized_definition
        ON CONFLICT (vocabulary_sense_id, topic, source) DO NOTHING
        """
    )
    by_gloss = cur.rowcount

    cur.execute(
        """
        INSERT INTO sense_topics (vocabulary_sense_id, topic, source)
        SELECT DISTINCT ss.vocabulary_sense_id, lower(m.member), 'wordnet-domain'
        FROM sense_synsets ss
        JOIN semantic_relationships r
          ON r.source_synset_id = ss.synset_id
         AND r.relationship_type = 'domain_topic'
        JOIN wordnet_synsets t ON t.synset_id = r.target_synset_id
        CROSS JOIN LATERAL unnest(t.members) AS m(member)
        WHERE length(m.member) >= 3
          AND lower(m.member) <> ALL(%s)
        ON CONFLICT (vocabulary_sense_id, topic, source) DO NOTHING
        """,
        (list(WORDNET_SKIP),),
    )
    by_wordnet = cur.rowcount

    retired = {"assignments": 0, "categories": 0}
    if retire_placeholders:
        cur.execute(
            """
            SELECT COUNT(*) FROM vocabulary_category_assignments
            WHERE category_id IN (
              SELECT id FROM categories
              WHERE name ~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$'
                 OR code ~ '_(BASICS|PEOPLE|PLACES|ACTIONS|THINGS|PROBLEMS|SKILLS|EVENTS)(_[1-4])?$'
            )
            """
        )
        before_asg = list(cur.fetchone().values())[0]
        for statement in PLACEHOLDER_SQL.split(";"):
            sql = statement.strip()
            if sql:
                cur.execute(sql)
        retired["assignments"] = before_asg
        cur.execute(
            """
            SELECT COUNT(*) FROM categories
            WHERE name ~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$'
            """
        )
        retired["placeholder_names_left"] = list(cur.fetchone().values())[0]

    cur.execute("SELECT COUNT(*) FROM sense_topics")
    total_topics = list(cur.fetchone().values())[0]
    cur.execute("SELECT COUNT(DISTINCT vocabulary_sense_id) FROM sense_topics")
    senses = list(cur.fetchone().values())[0]
    cur.execute("SELECT COUNT(*) FROM categories")
    categories = list(cur.fetchone().values())[0]
    cur.close()
    conn.close()

    summary = {
        "sidecar_rows_staged": inserted_stage,
        "inserted_by_gloss": by_gloss,
        "inserted_by_wordnet": by_wordnet,
        "sense_topic_rows": total_topics,
        "senses_with_topic": senses,
        "categories_remaining": categories,
        "retired": retired,
    }
    LOG.info("apply-topics: %s", summary)
    return summary
