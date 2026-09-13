import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FsrsService, FsrsStateName } from '../fsrs/fsrs.service';
import { pageMeta } from '../common/utils/page-meta';
import { PrismaService } from '../database/prisma.service';
import {
  DueReviewsQueryDto,
  LearningStatus,
  OverrideStateDto,
  ReviewRating,
  ReviewSenseDto,
  StudentVocabularyQueryDto,
} from './dto/learning.dto';

/**
 * A sense is considered mastered once FSRS raises its stability past this
 * many days at the requested retention while it has never lapsed, and it is
 * in the Review scheduling state. Intentional: no single correct answer ever
 * auto-promotes a word.
 */
const MASTERED_STABILITY_DAYS = 21;

export interface StudentStateDto {
  id: number;
  studentId: number;
  senseId: number;
  status: LearningStatus;
  firstEncounteredAt: string | null;
  firstLearnedAt: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  lapses: number;
  createdAt: string;
  updatedAt: string;
  isDue: boolean;
}

export interface StudentVocabSenseLite {
  id: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  tags: string[];
  senseIdHint: string | null;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: Array<{
    id: number;
    text: string;
    senseLabel: string | null;
    matchMethod: string | null;
    matchConfidence: string | null;
  }>;
}

export interface StudentVocabRow {
  state: StudentStateDto;
  sense: StudentVocabSenseLite;
}

export interface PaginatedStudentVocab {
  data: StudentVocabRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StudentVocabDetail {
  state: StudentStateDto;
  sense: StudentVocabSenseLite & {
    wikidataQid: string | null;
    examples: Array<{
      id: number;
      text: string;
      source: string;
      verification: string | null;
    }>;
    cefr: Array<{
      level: string;
      confidence: string;
      requiresReview: boolean;
      source: string | null;
    }>;
    wordnet: Array<{
      synsetId: string;
      definition: string;
      members: string[];
      confidence: string;
    }>;
    categories: Array<{ code: string; name: string }>;
  };
  recentReviews: ReviewHistoryRow[];
}

export interface ReviewHistoryRow {
  id: number;
  rating: ReviewRating | null;
  responseTimeMs: number | null;
  previousStatus: LearningStatus;
  newStatus: LearningStatus;
  previousDifficulty: number | null;
  newDifficulty: number | null;
  previousStability: number | null;
  newStability: number | null;
  previousNextReviewAt: string | null;
  nextReviewAt: string | null;
  sourceType: string;
  sourceId: number | null;
  reviewedAt: string;
  createdAt: string;
}

export interface StudentStateSummary {
  assigned: number;
  encountered: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueNow: number;
  dueTomorrow: number;
  difficult: number;
  total: number;
}

interface StateRow {
  stateId: bigint;
  status: LearningStatus;
  firstEncounteredAt: Date | null;
  firstLearnedAt: Date | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  lapses: number;
  stateCreatedAt: Date;
  stateUpdatedAt: Date;
  isDue: boolean;
  senseId: bigint;
  entryId: bigint;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  tags: string[];
  senseIdHint: string | null;
  cefrLevels: string[];
  frequencyRank: number | null;
}

interface TranslationRow {
  vocabularySenseId: bigint;
  id: bigint;
  text: string;
  senseLabel: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
}

const DUE_CONDITION = Prisma.sql`(
  svs.status = 'ENCOUNTERED'
  OR (svs.status IN ('LEARNING', 'REVIEWING')
      AND (svs.next_review_at IS NULL OR svs.next_review_at <= NOW()))
  OR (svs.status = 'MASTERED'
      AND svs.next_review_at IS NOT NULL AND svs.next_review_at <= NOW())
)`;

const STATE_AND_SENSE_SELECT = Prisma.sql`
SELECT
  svs.id                     AS "stateId",
  svs.status,
  svs.first_encountered_at   AS "firstEncounteredAt",
  svs.first_learned_at       AS "firstLearnedAt",
  svs.last_reviewed_at       AS "lastReviewedAt",
  svs.next_review_at         AS "nextReviewAt",
  svs.review_count           AS "reviewCount",
  svs.correct_count          AS "correctCount",
  svs.incorrect_count        AS "incorrectCount",
  svs.difficulty,
  svs.stability,
  svs.retrievability,
  svs.lapses,
  svs.created_at             AS "stateCreatedAt",
  svs.updated_at             AS "stateUpdatedAt",
  CASE
    WHEN svs.status = 'ENCOUNTERED' THEN TRUE
    WHEN svs.status IN ('LEARNING', 'REVIEWING')
      AND (svs.next_review_at IS NULL OR svs.next_review_at <= NOW()) THEN TRUE
    WHEN svs.status = 'MASTERED'
      AND svs.next_review_at IS NOT NULL AND svs.next_review_at <= NOW() THEN TRUE
    ELSE FALSE
  END                        AS "isDue",
  s.id                       AS "senseId",
  s.vocabulary_entry_id      AS "entryId",
  e.lemma,
  e.normalized_lemma         AS "normalizedLemma",
  e.part_of_speech           AS "partOfSpeech",
  e.display_form             AS "displayForm",
  s.position,
  s.definition,
  s.tags,
  s.sense_id_hint            AS "senseIdHint",
  (SELECT array_agg(DISTINCT c.level ORDER BY c.level)
     FROM cefr_assignments c WHERE c.vocabulary_sense_id = s.id) AS "cefrLevels",
  f.rank                     AS "frequencyRank"
FROM student_vocabulary_states svs
JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
LEFT JOIN LATERAL (
  SELECT MIN(fd.rank) AS rank FROM frequency_data fd WHERE fd.vocabulary_entry_id = e.id
) f ON TRUE
`;

function statusToFsrsState(status: LearningStatus): FsrsStateName {
  switch (status) {
    case 'LEARNING':
      return 'Learning';
    case 'REVIEWING':
    case 'MASTERED':
      return 'Review';
    default:
      return 'New';
  }
}

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fsrs: FsrsService,
  ) {}

  async assign(
    studentId: number,
    senseId: number,
    sourceType = 'manual',
  ): Promise<StudentStateDto> {
    await this.assertStudent(studentId);
    await this.assertSense(senseId);
    const now = new Date();

    const existing = await this.prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
        },
      },
    });
    if (existing) {
      return this.toStateDto(existing, this.isDueRecord(existing));
    }

    const state = await this.prisma.student_vocabulary_states.create({
      data: {
        student_id: BigInt(studentId),
        vocabulary_sense_id: BigInt(senseId),
        status: 'ASSIGNED',
        first_encountered_at: sourceType === 'activity' ? now : null,
      },
    });
    return this.toStateDto(state, false);
  }

  async list(
    studentId: number,
    query: StudentVocabularyQueryDto,
  ): Promise<PaginatedStudentVocab> {
    await this.assertStudent(studentId);
    const where = this.buildStudentWhere(studentId, query);
    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<StateRow[]>(
        Prisma.sql`${STATE_AND_SENSE_SELECT} WHERE ${where}
          ORDER BY svs.next_review_at ASC NULLS LAST,
                   e.normalized_lemma ASC, s.position ASC
          LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT count(*) AS total
          FROM student_vocabulary_states svs
          JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
          JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
          WHERE ${where}`,
      ),
    ]);

    const total = Number(counted[0]?.total ?? 0);
    return {
      data: await this.mapRows(studentId, rows),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async detail(
    studentId: number,
    senseId: number,
  ): Promise<
    StudentVocabRow & {
      sense: StudentVocabSenseLite & {
        examples: Array<{
          id: number;
          text: string;
          source: string;
          verification: string | null;
        }>;
        wikidataQid: string | null;
        cefr: Array<{
          level: string;
          confidence: string;
          requiresReview: boolean;
          source: string | null;
        }>;
        wordnet: Array<{
          synsetId: string;
          definition: string;
          members: string[];
          confidence: string;
        }>;
        categories: Array<{ code: string; name: string }>;
      };
      recentReviews: ReviewHistoryRow[];
    }
  > {
    await this.assertStudent(studentId);
    const state = await this.prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
        },
      },
    });
    if (!state) {
      throw new NotFoundException(
        `Vocabulary sense ${senseId} is not in student ${studentId} state space`,
      );
    }

    const sense = await this.prisma.vocabulary_senses.findUnique({
      where: { id: BigInt(senseId) },
      include: {
        vocabulary_entries: {
          select: {
            id: true,
            lemma: true,
            normalized_lemma: true,
            part_of_speech: true,
            display_form: true,
          },
        },
        translations: {
          where: { language: 'pl' },
          orderBy: { id: 'asc' },
        },
        example_sentences: { orderBy: { id: 'asc' } },
        cefr_assignments: {
          include: { vocabulary_sources: { select: { name: true } } },
        },
        sense_synsets: {
          include: {
            wordnet_synsets: {
              select: {
                synset_id: true,
                definition: true,
                members: true,
              },
            },
          },
        },
        vocabulary_category_assignments: {
          include: { categories: { select: { code: true, name: true } } },
        },
      },
    });
    if (!sense) {
      throw new NotFoundException(`Vocabulary sense ${senseId} not found`);
    }

    const entry = sense.vocabulary_entries;
    const recentReviews = await this.prisma.vocabulary_review_history.findMany({
      where: { student_vocabulary_state_id: state.id },
      orderBy: { reviewed_at: 'desc' },
      take: 20,
    });

    const now = new Date();
    const isDue = this.isDueRecord(state);
    return {
      state: {
        ...this.toStateDto(state, isDue),
        retrievability:
          state.retrievability ??
          this.fsrs.retrievability(
            state.stability === null ? null : Number(state.stability),
            state.last_reviewed_at,
            now,
            state.next_review_at,
          ),
      },
      sense: {
        id: Number(sense.id),
        entryId: Number(entry.id),
        lemma: entry.lemma,
        normalizedLemma: entry.normalized_lemma,
        partOfSpeech: entry.part_of_speech,
        displayForm: entry.display_form,
        position: sense.position,
        definition: sense.definition,
        tags: sense.tags ?? [],
        senseIdHint: sense.sense_id_hint,
        wikidataQid: sense.wikidata_qid,
        cefrLevels: sense.cefr_assignments.map((c) => c.level),
        frequencyRank: null,
        translations: sense.translations.map((t) => ({
          id: Number(t.id),
          text: t.text,
          senseLabel: t.sense_label,
          matchMethod: t.match_method,
          matchConfidence: t.match_confidence,
        })),
        examples: sense.example_sentences.map((x) => ({
          id: Number(x.id),
          text: x.text,
          source: x.source,
          verification: x.verification,
        })),
        cefr: sense.cefr_assignments.map((c) => ({
          level: c.level,
          confidence: c.confidence,
          requiresReview: c.requires_review,
          source: c.vocabulary_sources?.name ?? null,
        })),
        wordnet: sense.sense_synsets.map((w) => ({
          synsetId: w.wordnet_synsets.synset_id,
          definition: w.wordnet_synsets.definition,
          members: w.wordnet_synsets.members ?? [],
          confidence: w.confidence,
        })),
        categories: sense.vocabulary_category_assignments.map((a) =>
          a.categories
            ? { code: a.categories.code, name: a.categories.name }
            : { code: '', name: '' },
        ),
      },
      recentReviews: recentReviews.map((r) => this.toHistoryRow(r)),
    };
  }

  /**
   * Core review operation. Runs FSRS scheduling, persists state + counters and
   * appends history inside ONE transaction so no partial updates can exist.
   *
   * An optional `tx` lets an outer transaction (e.g. an activity event write)
   * include the review atomically -- the tracking event and the FSRS update are
   * then committed together or rolled back together.
   */
  async review(
    studentId: number,
    senseId: number,
    dto: ReviewSenseDto,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const now = new Date();
      await this.assertStudentTx(client, studentId);
      await this.assertSenseTx(client, senseId);

      const state = await this.lockOrCreateState(
        client,
        studentId,
        senseId,
        now,
      );

      const previousStatus = state.status;
      const previousDifficulty =
        state.difficulty === null ? null : Number(state.difficulty);
      const previousStability =
        state.stability === null ? null : Number(state.stability);
      const previousNextReviewAt = state.next_review_at;

      const outcome = this.fsrs.review(
        {
          due: state.next_review_at,
          stability: previousStability ?? 0,
          difficulty: previousDifficulty ?? 0,
          reps: state.review_count,
          lapses: state.lapses,
          state: statusToFsrsState(previousStatus),
          lastReview: state.last_reviewed_at,
        },
        dto.rating,
        now,
      );

      const newStatus = this.nextStatus(
        previousStatus,
        outcome.state,
        outcome.stability,
        outcome.lapses,
      );
      const correct = dto.rating === 'GOOD' || dto.rating === 'EASY';

      const firstLearnedAt =
        state.first_learned_at ?? (newStatus !== 'ASSIGNED' ? now : null);

      const updated = await client.student_vocabulary_states.update({
        where: { id: state.id },
        data: {
          status: newStatus,
          last_reviewed_at: outcome.lastReview,
          next_review_at: outcome.due,
          review_count: { increment: 1 },
          correct_count: { increment: correct ? 1 : 0 },
          incorrect_count: { increment: correct ? 0 : 1 },
          difficulty: outcome.difficulty,
          stability: outcome.stability,
          retrievability: outcome.retrievability,
          lapses: outcome.lapses,
          first_learned_at: firstLearnedAt,
          fsrs_state: {
            state: outcome.state,
            stability: outcome.stability,
            difficulty: outcome.difficulty,
            reps: outcome.reps,
            lapses: outcome.lapses,
            due: outcome.due.toISOString(),
            last_review: outcome.lastReview.toISOString(),
          },
          updated_at: now,
        },
      });

      await client.vocabulary_review_history.create({
        data: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
          student_vocabulary_state_id: updated.id,
          rating: dto.rating,
          response_time_ms: dto.responseTimeMs ?? null,
          previous_status: previousStatus,
          new_status: newStatus,
          previous_difficulty: previousDifficulty,
          new_difficulty: outcome.difficulty,
          previous_stability: previousStability,
          new_stability: outcome.stability,
          previous_next_review_at: previousNextReviewAt,
          next_review_at: outcome.due,
          source_type: dto.sourceType,
          source_id: dto.sourceId ? BigInt(dto.sourceId) : null,
        },
      });
    };

    if (tx) {
      await run(tx);
      return;
    }
    await this.prisma.$transaction(run);
  }

  /** Teacher override: changes status, records an immutable audit row. */
  async override(
    studentId: number,
    senseId: number,
    dto: OverrideStateDto,
  ): Promise<StudentStateDto> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await this.assertStudentTx(tx, studentId);
      await this.assertSenseTx(tx, senseId);
      const state = await this.lockOrCreateState(tx, studentId, senseId, now);
      const previousStatus = state.status;

      const updated = await tx.student_vocabulary_states.update({
        where: { id: state.id },
        data: {
          status: dto.status,
          next_review_at: dto.forceDue
            ? now
            : dto.status === 'MASTERED'
              ? null
              : state.next_review_at,
          updated_at: now,
        },
      });

      await tx.vocabulary_review_history.create({
        data: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
          student_vocabulary_state_id: state.id,
          rating: null,
          previous_status: previousStatus,
          new_status: dto.status,
          previous_difficulty:
            state.difficulty === null ? null : Number(state.difficulty),
          new_difficulty:
            updated.difficulty === null ? null : Number(updated.difficulty),
          previous_stability:
            state.stability === null ? null : Number(state.stability),
          new_stability:
            updated.stability === null ? null : Number(updated.stability),
          previous_next_review_at: state.next_review_at,
          next_review_at:
            dto.status === 'MASTERED' ? null : updated.next_review_at,
          source_type: 'teacher-override',
          source_id: null,
        },
      });

      return this.toStateDto(updated, this.isDueRecord(updated));
    });
  }

  async due(
    studentId: number,
    query: DueReviewsQueryDto,
  ): Promise<PaginatedStudentVocab> {
    await this.assertStudent(studentId);
    const where = Prisma.sql`svs.student_id = ${studentId} AND ${DUE_CONDITION}`;
    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<StateRow[]>(
        Prisma.sql`${STATE_AND_SENSE_SELECT} WHERE ${where}
          ORDER BY (svs.status = 'ENCOUNTERED') DESC,
                   svs.next_review_at ASC NULLS FIRST, s.position ASC
          LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT count(*) AS total
          FROM student_vocabulary_states svs
          JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
          JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
          WHERE ${where}`,
      ),
    ]);

    const total = Number(counted[0]?.total ?? 0);
    return {
      data: await this.mapRows(studentId, rows),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async summary(studentId: number): Promise<StudentStateSummary> {
    await this.assertStudent(studentId);
    const rows = await this.prisma.$queryRaw<
      Array<{ status: LearningStatus; count: bigint }>
    >`
      SELECT status, count(*) AS count
      FROM student_vocabulary_states
      WHERE student_id = ${studentId}
      GROUP BY status`;
    const due = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count
      FROM student_vocabulary_states svs
      WHERE svs.student_id = ${studentId} AND ${DUE_CONDITION}`;
    const dueTomorrow = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count
      FROM student_vocabulary_states svs
      WHERE svs.student_id = ${studentId}
        AND svs.next_review_at IS NOT NULL
        AND svs.next_review_at::date = (CURRENT_DATE + INTERVAL '1 day')`;
    const difficult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count
      FROM student_vocabulary_states svs
      WHERE svs.student_id = ${studentId}
        AND (svs.incorrect_count > svs.correct_count OR svs.lapses >= 2)`;

    const counts: Record<string, number> = {
      ASSIGNED: 0,
      ENCOUNTERED: 0,
      LEARNING: 0,
      REVIEWING: 0,
      MASTERED: 0,
    };
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    return {
      assigned: counts.ASSIGNED,
      encountered: counts.ENCOUNTERED,
      learning: counts.LEARNING,
      reviewing: counts.REVIEWING,
      mastered: counts.MASTERED,
      dueNow: Number(due[0]?.count ?? 0),
      dueTomorrow: Number(dueTomorrow[0]?.count ?? 0),
      difficult: Number(difficult[0]?.count ?? 0),
      total:
        counts.ASSIGNED +
        counts.ENCOUNTERED +
        counts.LEARNING +
        counts.REVIEWING +
        counts.MASTERED,
    };
  }

  async distribution(studentId: number): Promise<{
    cefr: Array<{ level: string; count: number }>;
    categories: Array<{ code: string; name: string; count: number }>;
    difficult: Array<{
      senseId: number;
      lemma: string;
      partOfSpeech: string;
      incorrectCount: number;
      lapses: number;
      status: string;
    }>;
  }> {
    await this.assertStudent(studentId);
    const cefr = await this.prisma.$queryRaw<
      Array<{ level: string; count: bigint }>
    >`
      SELECT c.level, count(DISTINCT svs.vocabulary_sense_id) AS count
      FROM student_vocabulary_states svs
      JOIN cefr_assignments c ON c.vocabulary_sense_id = svs.vocabulary_sense_id
      WHERE svs.student_id = ${studentId}
      GROUP BY c.level
      ORDER BY c.level`;
    const categories = await this.prisma.$queryRaw<
      Array<{ code: string; name: string; count: bigint }>
    >`
      SELECT cat.code, cat.name, count(DISTINCT svs.vocabulary_sense_id) AS count
      FROM student_vocabulary_states svs
      JOIN vocabulary_category_assignments vca
        ON vca.vocabulary_sense_id = svs.vocabulary_sense_id
      JOIN categories cat ON cat.id = vca.category_id
      WHERE svs.student_id = ${studentId}
      GROUP BY cat.id, cat.code, cat.name
      ORDER BY count DESC, cat.name ASC
      LIMIT 40`;
    const difficult = await this.prisma.$queryRaw<
      Array<{
        senseId: bigint;
        lemma: string;
        partOfSpeech: string;
        incorrectCount: number;
        lapses: number;
        status: string;
      }>
    >`
      SELECT s.id AS "senseId", e.lemma, e.part_of_speech AS "partOfSpeech",
             svs.incorrect_count AS "incorrectCount", svs.lapses, svs.status
      FROM student_vocabulary_states svs
      JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
      JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
      WHERE svs.student_id = ${studentId}
        AND (svs.incorrect_count > svs.correct_count OR svs.lapses >= 2)
      ORDER BY svs.incorrect_count DESC, svs.lapses DESC
      LIMIT 25`;
    return {
      cefr: cefr.map((r) => ({ level: r.level, count: Number(r.count) })),
      categories: categories.map((r) => ({
        code: r.code,
        name: r.name,
        count: Number(r.count),
      })),
      difficult: difficult.map((r) => ({
        senseId: Number(r.senseId),
        lemma: r.lemma,
        partOfSpeech: r.partOfSpeech,
        incorrectCount: r.incorrectCount,
        lapses: r.lapses,
        status: r.status,
      })),
    };
  }

  async unassign(studentId: number, senseId: number): Promise<{ removed: true }> {
    await this.assertStudent(studentId);
    const state = await this.prisma.student_vocabulary_states.findFirst({
      where: {
        student_id: BigInt(studentId),
        vocabulary_sense_id: BigInt(senseId),
      },
    });
    if (!state) {
      throw new NotFoundException('Learning state not found');
    }
    await this.prisma.student_vocabulary_states.delete({
      where: { id: state.id },
    });
    return { removed: true };
  }

  // ---------------------------------------------------------------- private

  private async mapRows(
    studentId: number,
    rows: StateRow[],
  ): Promise<StudentVocabRow[]> {
    if (rows.length === 0) return [];
    const translations = await this.loadTranslations(rows);
    return rows.map((row) => ({
      state: {
        id: Number(row.stateId),
        studentId,
        senseId: Number(row.senseId),
        status: row.status,
        firstEncounteredAt: row.firstEncounteredAt?.toISOString() ?? null,
        firstLearnedAt: row.firstLearnedAt?.toISOString() ?? null,
        lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
        nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
        reviewCount: Number(row.reviewCount),
        correctCount: Number(row.correctCount),
        incorrectCount: Number(row.incorrectCount),
        difficulty: row.difficulty === null ? null : Number(row.difficulty),
        stability: row.stability === null ? null : Number(row.stability),
        retrievability:
          row.retrievability === null ? null : Number(row.retrievability),
        lapses: Number(row.lapses),
        createdAt: row.stateCreatedAt.toISOString(),
        updatedAt: row.stateUpdatedAt.toISOString(),
        isDue: row.isDue,
      },
      sense: {
        id: Number(row.senseId),
        entryId: Number(row.entryId),
        lemma: row.lemma,
        normalizedLemma: row.normalizedLemma,
        partOfSpeech: row.partOfSpeech,
        displayForm: row.displayForm,
        position: row.position,
        definition: row.definition,
        tags: row.tags ?? [],
        senseIdHint: row.senseIdHint,
        cefrLevels: row.cefrLevels ?? [],
        frequencyRank:
          row.frequencyRank === null ? null : Number(row.frequencyRank),
        translations: translations.get(row.senseId) ?? [],
      },
    }));
  }

  private async loadTranslations(
    rows: StateRow[],
  ): Promise<Map<bigint, StudentVocabSenseLite['translations']>> {
    const ids = rows.map((r) => r.senseId);
    const results = await this.prisma.$queryRaw<TranslationRow[]>(
      Prisma.sql`SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          id,
          text,
          sense_label AS "senseLabel",
          match_method AS "matchMethod",
          match_confidence AS "matchConfidence"
        FROM translations
        WHERE vocabulary_sense_id IN (${Prisma.join(ids)})
          AND language = 'pl'
        ORDER BY vocabulary_sense_id, id`,
    );
    const grouped = new Map<bigint, StudentVocabSenseLite['translations']>();
    for (const row of results) {
      const list = grouped.get(row.vocabularySenseId) ?? [];
      list.push({
        id: Number(row.id),
        text: row.text,
        senseLabel: row.senseLabel,
        matchMethod: row.matchMethod,
        matchConfidence: row.matchConfidence,
      });
      grouped.set(row.vocabularySenseId, list);
    }
    return grouped;
  }

  private buildStudentWhere(
    studentId: number,
    query: StudentVocabularyQueryDto,
  ): Prisma.Sql {
    const clauses: Prisma.Sql[] = [Prisma.sql`svs.student_id = ${studentId}`];

    if (query.status) {
      clauses.push(
        Prisma.sql`svs.status = CAST(${query.status} AS learning_status)`,
      );
    }

    if (query.partOfSpeech) {
      clauses.push(Prisma.sql`e.part_of_speech = ${query.partOfSpeech}`);
    }

    if (query.cefr) {
      clauses.push(Prisma.sql`EXISTS (
        SELECT 1 FROM cefr_assignments c
        WHERE c.vocabulary_sense_id = s.id AND c.level = ${query.cefr}
      )`);
    }

    if (query.search && query.search.trim().length > 0) {
      const pattern = `%${query.search.trim()}%`;
      clauses.push(Prisma.sql`(
        e.normalized_lemma ILIKE ${pattern}
        OR s.normalized_definition ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM translations t
          WHERE t.vocabulary_sense_id = s.id
            AND t.normalized_text ILIKE ${pattern}
        )
      )`);
    }

    if (query.due === true) {
      clauses.push(DUE_CONDITION);
    } else if (query.due === false) {
      clauses.push(Prisma.sql`NOT ${DUE_CONDITION}`);
    }

    return Prisma.join(clauses, ' AND ');
  }

  private isDueRecord(state: {
    status: LearningStatus;
    next_review_at: Date | null;
  }): boolean {
    const now = new Date();
    if (state.status === 'ENCOUNTERED') return true;
    if (state.status === 'LEARNING' || state.status === 'REVIEWING') {
      return state.next_review_at === null || state.next_review_at <= now;
    }
    if (state.status === 'MASTERED') {
      return state.next_review_at !== null && state.next_review_at <= now;
    }
    return false;
  }

  private nextStatus(
    previous: LearningStatus,
    fsrsState: FsrsStateName,
    stability: number,
    lapses: number,
  ): LearningStatus {
    let status: LearningStatus;
    switch (fsrsState) {
      case 'Learning':
      case 'Relearning':
        status = 'LEARNING';
        break;
      case 'Review':
      default:
        status = previous === 'MASTERED' ? 'MASTERED' : 'REVIEWING';
    }
    if (
      status === 'REVIEWING' &&
      stability >= MASTERED_STABILITY_DAYS &&
      lapses === 0
    ) {
      status = 'MASTERED';
    }
    return status;
  }

  private toStateDto(
    state: {
      id: bigint;
      student_id: bigint;
      vocabulary_sense_id: bigint;
      status: LearningStatus;
      first_encountered_at: Date | null;
      first_learned_at: Date | null;
      last_reviewed_at: Date | null;
      next_review_at: Date | null;
      review_count: number;
      correct_count: number;
      incorrect_count: number;
      difficulty: number | null;
      stability: number | null;
      retrievability: number | null;
      lapses: number;
      created_at: Date;
      updated_at: Date;
    },
    isDue: boolean,
  ): StudentStateDto {
    return {
      id: Number(state.id),
      studentId: Number(state.student_id),
      senseId: Number(state.vocabulary_sense_id),
      status: state.status,
      firstEncounteredAt: state.first_encountered_at?.toISOString() ?? null,
      firstLearnedAt: state.first_learned_at?.toISOString() ?? null,
      lastReviewedAt: state.last_reviewed_at?.toISOString() ?? null,
      nextReviewAt: state.next_review_at?.toISOString() ?? null,
      reviewCount: Number(state.review_count),
      correctCount: Number(state.correct_count),
      incorrectCount: Number(state.incorrect_count),
      difficulty: state.difficulty === null ? null : Number(state.difficulty),
      stability: state.stability === null ? null : Number(state.stability),
      retrievability:
        state.retrievability === null ? null : Number(state.retrievability),
      lapses: Number(state.lapses),
      createdAt: state.created_at.toISOString(),
      updatedAt: state.updated_at.toISOString(),
      isDue,
    };
  }

  private toHistoryRow(row: {
    id: bigint;
    rating: ReviewRating | null;
    response_time_ms: number | null;
    previous_status: LearningStatus;
    new_status: LearningStatus;
    previous_difficulty: number | null;
    new_difficulty: number | null;
    previous_stability: number | null;
    new_stability: number | null;
    previous_next_review_at: Date | null;
    next_review_at: Date | null;
    source_type: string;
    source_id: bigint | null;
    reviewed_at: Date;
    created_at: Date;
  }): ReviewHistoryRow {
    return {
      id: Number(row.id),
      rating: row.rating,
      responseTimeMs:
        row.response_time_ms === null ? null : Number(row.response_time_ms),
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      previousDifficulty:
        row.previous_difficulty === null
          ? null
          : Number(row.previous_difficulty),
      newDifficulty:
        row.new_difficulty === null ? null : Number(row.new_difficulty),
      previousStability:
        row.previous_stability === null ? null : Number(row.previous_stability),
      newStability:
        row.new_stability === null ? null : Number(row.new_stability),
      previousNextReviewAt: row.previous_next_review_at?.toISOString() ?? null,
      nextReviewAt: row.next_review_at?.toISOString() ?? null,
      sourceType: row.source_type,
      sourceId: row.source_id === null ? null : Number(row.source_id),
      reviewedAt: row.reviewed_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    };
  }

  private async lockOrCreateState(
    tx: Prisma.TransactionClient,
    studentId: number,
    senseId: number,
    now: Date,
  ) {
    const locked = await tx.$queryRaw<
      Array<Record<string, unknown> & { id: bigint }>
    >(
      Prisma.sql`SELECT * FROM student_vocabulary_states
        WHERE student_id = ${studentId} AND vocabulary_sense_id = ${senseId}
        FOR UPDATE`,
    );

    if (locked.length > 0) {
      return this.rowToPrismaState(locked[0]);
    }

    try {
      return await tx.student_vocabulary_states.create({
        data: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
          status: 'ASSIGNED',
          first_encountered_at: now,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const rows = await tx.$queryRaw<
          Array<Record<string, unknown> & { id: bigint }>
        >(
          Prisma.sql`SELECT * FROM student_vocabulary_states
            WHERE student_id = ${studentId} AND vocabulary_sense_id = ${senseId}
            FOR UPDATE`,
        );
        return this.rowToPrismaState(rows[0]);
      }
      throw err;
    }
  }

  private rowToPrismaState(row: Record<string, unknown> & { id: bigint }): {
    id: bigint;
    status: LearningStatus;
    next_review_at: Date | null;
    last_reviewed_at: Date | null;
    first_learned_at: Date | null;
    first_encountered_at: Date | null;
    review_count: number;
    correct_count: number;
    incorrect_count: number;
    stability: number | null;
    difficulty: number | null;
    retrievability: number | null;
    lapses: number;
    fsrs_state: Prisma.JsonValue;
    created_at: Date;
    updated_at: Date;
  } {
    return {
      id: row.id,
      status: row['status'] as LearningStatus,
      next_review_at: (row['next_review_at'] as Date | null) ?? null,
      last_reviewed_at: (row['last_reviewed_at'] as Date | null) ?? null,
      first_learned_at: (row['first_learned_at'] as Date | null) ?? null,
      first_encountered_at:
        (row['first_encountered_at'] as Date | null) ?? null,
      review_count: Number(row['review_count'] ?? 0),
      correct_count: Number(row['correct_count'] ?? 0),
      incorrect_count: Number(row['incorrect_count'] ?? 0),
      stability: (row['stability'] as number | null) ?? null,
      difficulty: (row['difficulty'] as number | null) ?? null,
      retrievability: (row['retrievability'] as number | null) ?? null,
      lapses: Number(row['lapses'] ?? 0),
      fsrs_state: (row['fsrs_state'] as Prisma.JsonValue) ?? null,
      created_at: row['created_at'] as Date,
      updated_at: row['updated_at'] as Date,
    };
  }

  private async assertStudent(studentId: number): Promise<void> {
    const student = await this.prisma.students.findUnique({
      where: { id: BigInt(studentId) },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
  }

  private async assertSense(senseId: number): Promise<void> {
    const sense = await this.prisma.vocabulary_senses.findUnique({
      where: { id: BigInt(senseId) },
      select: { id: true },
    });
    if (!sense) {
      throw new NotFoundException(`Vocabulary sense ${senseId} not found`);
    }
  }

  private async assertStudentTx(
    tx: Prisma.TransactionClient,
    studentId: number,
  ): Promise<void> {
    const student = await tx.students.findUnique({
      where: { id: BigInt(studentId) },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
  }

  private async assertSenseTx(
    tx: Prisma.TransactionClient,
    senseId: number,
  ): Promise<void> {
    const sense = await tx.vocabulary_senses.findUnique({
      where: { id: BigInt(senseId) },
      select: { id: true },
    });
    if (!sense) {
      throw new NotFoundException(`Vocabulary sense ${senseId} not found`);
    }
  }
}
