import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface SessionAnswerStats {
  completed: number;
  correct: number;
  incorrect: number;
  answeredSenseIds: number[];
}

const EMPTY: SessionAnswerStats = {
  completed: 0,
  correct: 0,
  incorrect: 0,
  answeredSenseIds: [],
};

interface LatestAnswerRow {
  sessionId: bigint;
  senseId: bigint;
  eventType: string;
}

/** Last graded answer per sense — a retry replaces the previous result. */
export async function loadSessionAnswerStats(
  db: PrismaService | Prisma.TransactionClient,
  sessionIds: bigint[],
): Promise<Map<bigint, SessionAnswerStats>> {
  const map = new Map<bigint, SessionAnswerStats>();
  if (sessionIds.length === 0) return map;

  const rows = await db.$queryRaw<LatestAnswerRow[]>(Prisma.sql`
    SELECT session_id AS "sessionId",
           vocabulary_sense_id AS "senseId",
           event_type AS "eventType"
    FROM (
      SELECT DISTINCT ON (session_id, vocabulary_sense_id)
             session_id, vocabulary_sense_id, event_type
        FROM activity_events
       WHERE session_id IN (${Prisma.join(sessionIds)})
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
    } else {
      current.incorrect += 1;
    }
    map.set(row.sessionId, current);
  }
  return map;
}

export function statsFor(
  map: Map<bigint, SessionAnswerStats>,
  sessionId: bigint,
): SessionAnswerStats {
  return map.get(sessionId) ?? EMPTY;
}

export function percentComplete(completed: number, totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Math.min(100, Math.round((completed / totalItems) * 100));
}
