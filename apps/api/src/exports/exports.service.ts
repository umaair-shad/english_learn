import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ReportsService } from '../reports/reports.service';
import {
  LearningExportDto,
  SessionsExportDto,
  VocabularyExportDto,
} from './exports.dto';
import { SerializedFile, ExportSerializer } from './serializer.service';
import { buildWhereSql } from '../vocabulary/vocabulary.service';

interface VocabularyExportRow {
  senseId: number;
  lemma: string;
  partOfSpeech: string;
  definition: string;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: string[];
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly serializer: ExportSerializer,
  ) {}

  async exportVocabulary(
    teacherId: number,
    query: VocabularyExportDto,
  ): Promise<SerializedFile> {
    void teacherId; // vocabulary catalog is shared, read-only for every teacher
    const rows = await this.prisma.$queryRaw<VocabularyExportRow[]>(
      Prisma.sql`${buildWhereSql(query)}
        ORDER BY e.normalized_lemma ASC, s.position ASC`,
    );

    const senseIds = rows.map((r) => BigInt(r.senseId));
    const translations = await this.loadTranslations(senseIds);

    const data = rows.map((r) => ({
      senseId: Number(r.senseId),
      lemma: r.lemma,
      partOfSpeech: r.partOfSpeech,
      definition: r.definition,
      cefrLevels: (r.cefrLevels ?? []).join(', '),
      frequencyRank: r.frequencyRank ?? '',
      polishTranslations: (translations.get(r.senseId) ?? []).join('; '),
    }));

    return this.serializer.serialize(query.format, 'vocabulary', data);
  }

  async exportStudents(
    teacherId: number,
    format: string,
  ): Promise<SerializedFile> {
    const students = await this.reports.students(teacherId, {
      limit: 5000,
    });
    const data = students.map((s) => ({
      studentId: s.studentId,
      displayName: s.displayName,
      active: s.isActive ? 'yes' : 'no',
      createdAt: s.createdAt,
      assignedSenses: s.totalAssignedSenses,
      assigned: s.assigned,
      encountered: s.encountered,
      learning: s.learning,
      reviewing: s.reviewing,
      mastered: s.mastered,
      dueReviews: s.due,
      reviewsDone: s.reviewsDone,
      sessionCount: s.sessionCount,
      lastActivityAt: s.lastActivityAt ?? '',
    }));
    return this.serializer.serialize(
      format as 'csv' | 'json' | 'xlsx',
      'students',
      data,
    );
  }

  async exportLearning(
    teacherId: number,
    query: LearningExportDto,
  ): Promise<SerializedFile> {
    const ownedIds = await this.reports.ownedStudentIds(teacherId);
    let studentClause = Prisma.empty;
    if (query.studentId !== undefined) {
      // Non-owned students resolve to an empty result, not an error or leak.
      studentClause = ownedIds.includes(query.studentId)
        ? Prisma.sql`AND svs.student_id = ${query.studentId}`
        : Prisma.sql`AND true = false`;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        studentId: bigint;
        studentDisplayName: string;
        senseId: bigint;
        lemma: string;
        partOfSpeech: string;
        status: string;
        isDue: boolean;
        nextReviewAt: Date | null;
        firstLearnedAt: Date | null;
        lastReviewedAt: Date | null;
        reviewCount: number;
        correctCount: number;
        incorrectCount: number;
        difficulty: number | null;
        stability: number | null;
        lapses: number;
        translation: string;
      }>
    >`
      SELECT
        svs.student_id AS "studentId",
        st.display_name AS "studentDisplayName",
        svs.vocabulary_sense_id AS "senseId",
        e.lemma,
        e.part_of_speech AS "partOfSpeech",
        svs.status,
        CASE
          WHEN svs.status = 'ENCOUNTERED' THEN true
          WHEN svs.status IN ('LEARNING', 'REVIEWING')
            AND (svs.next_review_at IS NULL OR svs.next_review_at <= NOW()) THEN true
          WHEN svs.status = 'MASTERED'
            AND svs.next_review_at IS NOT NULL AND svs.next_review_at <= NOW() THEN true
          ELSE false
        END AS "isDue",
        svs.next_review_at AS "nextReviewAt",
        svs.first_learned_at AS "firstLearnedAt",
        svs.last_reviewed_at AS "lastReviewedAt",
        svs.review_count AS "reviewCount",
        svs.correct_count AS "correctCount",
        svs.incorrect_count AS "incorrectCount",
        svs.difficulty,
        svs.stability,
        svs.lapses,
        (SELECT string_agg(t.text, '; ' ORDER BY t.id)
           FROM translations t WHERE t.vocabulary_sense_id = svs.vocabulary_sense_id
             AND t.language = 'pl') AS "translation"
      FROM student_vocabulary_states svs
      JOIN students st ON st.id = svs.student_id
      JOIN vocabulary_entries e ON e.id = (
        SELECT vocabulary_entry_id FROM vocabulary_senses
        WHERE id = svs.vocabulary_sense_id
      )
      WHERE svs.student_id IN (${Prisma.join(ownedIds)})
        ${studentClause}
      ORDER BY st.display_name ASC, e.normalized_lemma ASC`;

    const data = rows.map((r) => ({
      studentId: Number(r.studentId),
      student: r.studentDisplayName,
      senseId: Number(r.senseId),
      lemma: r.lemma,
      partOfSpeech: r.partOfSpeech,
      polishTranslation: r.translation ?? '',
      status: r.status,
      isDue: r.isDue ? 'yes' : 'no',
      nextReviewAt: r.nextReviewAt?.toISOString() ?? '',
      firstLearnedAt: r.firstLearnedAt?.toISOString() ?? '',
      lastReviewedAt: r.lastReviewedAt?.toISOString() ?? '',
      reviewCount: Number(r.reviewCount),
      correctCount: Number(r.correctCount),
      incorrectCount: Number(r.incorrectCount),
      difficulty: r.difficulty ?? '',
      stability: r.stability ?? '',
      lapses: Number(r.lapses),
    }));

    return this.serializer.serialize(query.format, 'learning', data);
  }

  async exportAssignments(
    teacherId: number,
    format: string,
  ): Promise<SerializedFile> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        assignmentId: bigint;
        title: string;
        studentDisplayName: string;
        status: string;
        assignedAt: Date | null;
        dueAt: Date | null;
        completedAt: Date | null;
        itemCount: bigint;
        masteredCount: bigint;
      }>
    >`
      SELECT
        asg.id AS "assignmentId",
        asg.title,
        st.display_name AS "studentDisplayName",
        asg.status,
        asg.assigned_at AS "assignedAt",
        asg.due_at AS "dueAt",
        asg.completed_at AS "completedAt",
        count(DISTINCT ai.id) AS "itemCount",
        count(DISTINCT ai.id) FILTER (WHERE svs.status = 'MASTERED') AS "masteredCount"
      FROM assignments asg
      JOIN students st ON st.id = asg.student_id
      LEFT JOIN assignment_items ai ON ai.assignment_id = asg.id
      LEFT JOIN student_vocabulary_states svs
        ON svs.vocabulary_sense_id = ai.vocabulary_sense_id
       AND svs.student_id = asg.student_id
      WHERE asg.created_by_teacher_id = ${teacherId}
      GROUP BY asg.id, asg.title, st.display_name, asg.status,
               asg.assigned_at, asg.due_at, asg.completed_at
      ORDER BY asg.created_at DESC`;

    const data = rows.map((r) => ({
      assignmentId: Number(r.assignmentId),
      title: r.title,
      student: r.studentDisplayName,
      status: r.status,
      assignedAt: r.assignedAt?.toISOString() ?? '',
      dueAt: r.dueAt?.toISOString() ?? '',
      completedAt: r.completedAt?.toISOString() ?? '',
      itemCount: Number(r.itemCount),
      masteredCount: Number(r.masteredCount),
      masteredPercent:
        Number(r.itemCount) === 0
          ? 0
          : Math.round((Number(r.masteredCount) / Number(r.itemCount)) * 100),
    }));

    return this.serializer.serialize(
      format as 'csv' | 'json' | 'xlsx',
      'assignments',
      data,
    );
  }

  async exportSessions(
    teacherId: number,
    query: SessionsExportDto,
  ): Promise<SerializedFile> {
    const clauses: Prisma.Sql[] = [Prisma.sql`a.teacher_id = ${teacherId}`];
    if (query.studentId !== undefined) {
      clauses.push(Prisma.sql`se.student_id = ${query.studentId}`);
    }
    if (query.activityType) {
      clauses.push(Prisma.sql`a.activity_type = ${query.activityType}`);
    }
    if (query.from) {
      clauses.push(Prisma.sql`se.started_at >= ${new Date(query.from)}`);
    }
    if (query.to) {
      const toDate =
        query.to.length === 10
          ? new Date(query.to + 'T23:59:59.999Z')
          : new Date(query.to);
      clauses.push(Prisma.sql`se.started_at <= ${toDate}`);
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        sessionId: bigint;
        studentId: bigint;
        studentDisplayName: string;
        activityId: bigint;
        activityTitle: string;
        activityType: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        totalItems: number;
        correctCount: number;
        incorrectCount: number;
        completed: bigint;
      }>
    >`
      SELECT
        se.id AS "sessionId",
        se.student_id AS "studentId",
        st.display_name AS "studentDisplayName",
        a.id AS "activityId",
        a.title AS "activityTitle",
        a.activity_type AS "activityType",
        se.status,
        se.started_at AS "startedAt",
        se.finished_at AS "finishedAt",
        se.total_items AS "totalItems",
        se.correct_count AS "correctCount",
        se.incorrect_count AS "incorrectCount",
        (SELECT count(DISTINCT ev.vocabulary_sense_id) FROM activity_events ev
          WHERE ev.session_id = se.id
            AND ev.event_type IN ('ANSWER_CORRECT', 'ANSWER_INCORRECT')) AS "completed"
      FROM activity_sessions se
      JOIN activities a ON a.id = se.activity_id
      JOIN students st ON st.id = se.student_id
      WHERE ${Prisma.join(clauses, ' AND ')}
      ORDER BY se.last_activity_at DESC`;

    const data = rows.map((r) => ({
      sessionId: Number(r.sessionId),
      studentId: Number(r.studentId),
      student: r.studentDisplayName,
      activityId: Number(r.activityId),
      activity: r.activityTitle,
      activityType: r.activityType,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? '',
      totalItems: r.totalItems,
      correctCount: Number(r.correctCount),
      incorrectCount: Number(r.incorrectCount),
      progress:
        r.totalItems === 0
          ? 0
          : Math.min(
              100,
              Math.round((Number(r.completed) / r.totalItems) * 100),
            ),
    }));

    return this.serializer.serialize(query.format, 'sessions', data);
  }

  private async loadTranslations(
    senseIds: bigint[],
  ): Promise<Map<number, string[]>> {
    if (senseIds.length === 0) return new Map();
    const map = new Map<number, string[]>();
    // Chunk to stay below PostgreSQL's 65535 bind-parameter limit.
    for (let i = 0; i < senseIds.length; i += 1000) {
      const chunk = senseIds.slice(i, i + 1000);
      const rows = await this.prisma.$queryRaw<
        Array<{ vocabularySenseId: bigint; text: string }>
      >(
        Prisma.sql`SELECT vocabulary_sense_id AS "vocabularySenseId", text
          FROM translations
          WHERE vocabulary_sense_id IN (${Prisma.join(chunk)})
            AND language = 'pl'
          ORDER BY vocabulary_sense_id, id`,
      );
      for (const row of rows) {
        const list = map.get(Number(row.vocabularySenseId)) ?? [];
        list.push(row.text);
        map.set(Number(row.vocabularySenseId), list);
      }
    }
    return map;
  }
}
