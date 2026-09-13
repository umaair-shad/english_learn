"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSessionAnswerStats = loadSessionAnswerStats;
exports.statsFor = statsFor;
exports.percentComplete = percentComplete;
const client_1 = require("@prisma/client");
const EMPTY = {
    completed: 0,
    correct: 0,
    incorrect: 0,
    answeredSenseIds: [],
};
async function loadSessionAnswerStats(db, sessionIds) {
    const map = new Map();
    if (sessionIds.length === 0)
        return map;
    const rows = await db.$queryRaw(client_1.Prisma.sql `
    SELECT session_id AS "sessionId",
           vocabulary_sense_id AS "senseId",
           event_type AS "eventType"
    FROM (
      SELECT DISTINCT ON (session_id, vocabulary_sense_id)
             session_id, vocabulary_sense_id, event_type
        FROM activity_events
       WHERE session_id IN (${client_1.Prisma.join(sessionIds)})
         AND vocabulary_sense_id IS NOT NULL
         AND event_type IN (
           'ANSWER_CORRECT', 'ANSWER_INCORRECT', 'MATCH_FOUND', 'MATCH_FAILED'
         )
       ORDER BY session_id, vocabulary_sense_id, id DESC
    ) latest
  `);
    for (const row of rows) {
        const current = map.get(row.sessionId) ?? {
            completed: 0,
            correct: 0,
            incorrect: 0,
            answeredSenseIds: [],
        };
        current.completed += 1;
        current.answeredSenseIds.push(Number(row.senseId));
        if (row.eventType === 'ANSWER_CORRECT' || row.eventType === 'MATCH_FOUND') {
            current.correct += 1;
        }
        else {
            current.incorrect += 1;
        }
        map.set(row.sessionId, current);
    }
    return map;
}
function statsFor(map, sessionId) {
    return map.get(sessionId) ?? EMPTY;
}
function percentComplete(completed, totalItems) {
    if (totalItems <= 0)
        return 0;
    return Math.min(100, Math.round((completed / totalItems) * 100));
}
//# sourceMappingURL=session-stats.helper.js.map