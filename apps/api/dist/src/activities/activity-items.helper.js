"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchActivitySenses = fetchActivitySenses;
exports.senseIsInActivity = senseIsInActivity;
const client_1 = require("@prisma/client");
const SENSE_COLUMNS = client_1.Prisma.sql `
SELECT
  ai.vocabulary_sense_id AS "senseId",
  s.vocabulary_entry_id  AS "entryId",
  e.lemma,
  e.normalized_lemma     AS "normalizedLemma",
  e.part_of_speech       AS "partOfSpeech",
  e.display_form         AS "displayForm",
  ai.position,
  s.definition,
  (SELECT array_agg(DISTINCT c.level ORDER BY c.level)
     FROM cefr_assignments c WHERE c.vocabulary_sense_id = s.id) AS "cefrLevels",
  f.rank                 AS "frequencyRank"
FROM activity_items ai
JOIN vocabulary_senses s ON s.id = ai.vocabulary_sense_id
JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
LEFT JOIN LATERAL (
  SELECT MIN(fd.rank) AS rank FROM frequency_data fd WHERE fd.vocabulary_entry_id = e.id
) f ON TRUE
`;
async function fetchActivitySenses(db, activityId) {
    const rows = await db.$queryRaw(client_1.Prisma.sql `${SENSE_COLUMNS} WHERE ai.activity_id = ${activityId}
      ORDER BY ai.position ASC`);
    if (rows.length === 0)
        return [];
    const ids = rows.map((r) => r.senseId);
    const [translations, categories, examples] = await Promise.all([
        db.$queryRaw(client_1.Prisma.sql `SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          id,
          text,
          sense_label AS "senseLabel",
          match_method AS "matchMethod",
          match_confidence AS "matchConfidence"
        FROM translations
        WHERE vocabulary_sense_id IN (${client_1.Prisma.join(ids)})
          AND language = 'pl'
        ORDER BY vocabulary_sense_id, id`),
        db.$queryRaw(client_1.Prisma.sql `SELECT
          vca.vocabulary_sense_id AS "vocabularySenseId",
          c.code,
          c.name
        FROM vocabulary_category_assignments vca
        JOIN categories c ON c.id = vca.category_id
        WHERE vca.vocabulary_sense_id IN (${client_1.Prisma.join(ids)})
        ORDER BY vca.vocabulary_sense_id, c.code`),
        db.$queryRaw(client_1.Prisma.sql `SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          text
        FROM example_sentences
        WHERE vocabulary_sense_id IN (${client_1.Prisma.join(ids)})
        ORDER BY vocabulary_sense_id, id`),
    ]);
    const translationMap = new Map();
    for (const t of translations) {
        const list = translationMap.get(t.vocabularySenseId) ?? [];
        list.push({
            id: Number(t.id),
            text: t.text,
            senseLabel: t.senseLabel,
            matchMethod: t.matchMethod,
            matchConfidence: t.matchConfidence,
        });
        translationMap.set(t.vocabularySenseId, list);
    }
    const categoryMap = new Map();
    for (const c of categories) {
        const list = categoryMap.get(c.vocabularySenseId) ?? [];
        list.push({ code: c.code, name: c.name });
        categoryMap.set(c.vocabularySenseId, list);
    }
    const exampleMap = new Map();
    for (const e of examples) {
        const list = exampleMap.get(e.vocabularySenseId) ?? [];
        list.push(e.text);
        exampleMap.set(e.vocabularySenseId, list);
    }
    return rows.map((row) => {
        const key = row.senseId;
        return {
            senseId: Number(key),
            entryId: Number(row.entryId),
            lemma: row.lemma,
            normalizedLemma: row.normalizedLemma,
            partOfSpeech: row.partOfSpeech,
            displayForm: row.displayForm,
            position: row.position,
            definition: row.definition,
            cefrLevels: row.cefrLevels ?? [],
            frequencyRank: row.frequencyRank === null ? null : Number(row.frequencyRank),
            categories: categoryMap.get(key) ?? [],
            translations: translationMap.get(key) ?? [],
            examples: exampleMap.get(key) ?? [],
        };
    });
}
async function senseIsInActivity(db, activityId, senseId) {
    const row = await db.activity_items.findFirst({
        where: {
            activity_id: BigInt(activityId),
            vocabulary_sense_id: BigInt(senseId),
        },
        select: { id: true },
    });
    return row !== null;
}
//# sourceMappingURL=activity-items.helper.js.map