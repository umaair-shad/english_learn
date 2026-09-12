"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const DUE_CONDITION = client_1.Prisma.sql `(
  svs.status = 'ENCOUNTERED'
  OR (svs.status IN ('LEARNING', 'REVIEWING')
      AND (svs.next_review_at IS NULL OR svs.next_review_at <= NOW()))
  OR (svs.status = 'MASTERED'
      AND svs.next_review_at IS NOT NULL AND svs.next_review_at <= NOW())
)`;
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    ownedStudentSql(teacherId) {
        return client_1.Prisma.sql `(
      s.id IN (
        SELECT student_id FROM activities WHERE teacher_id = ${teacherId}
      )
      OR s.id IN (
        SELECT student_id FROM assignments WHERE created_by_teacher_id = ${teacherId}
      )
    )`;
    }
    async dashboard(teacherId) {
        const [studentsAgg, assignmentsAgg, activitiesAgg, statesAgg, dueAgg, catalog, reviewsAgg, trend,] = await Promise.all([
            this.prisma.$queryRaw `SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active
          FROM students s WHERE ${this.ownedStudentSql(teacherId)}`,
            this.prisma.$queryRaw `SELECT count(*) AS total,
             count(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')) AS active,
             count(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')
               AND due_at IS NOT NULL AND due_at < NOW()) AS overdue
          FROM assignments WHERE created_by_teacher_id = ${teacherId}`,
            this.prisma.$queryRaw `SELECT count(*) AS total,
             count(*) FILTER (WHERE status = 'ACTIVE') AS active
          FROM activities WHERE teacher_id = ${teacherId}`,
            this.prisma.$queryRaw `SELECT svs.status AS status, count(*) AS count
          FROM student_vocabulary_states svs
          JOIN students s ON s.id = svs.student_id
          WHERE ${this.ownedStudentSql(teacherId)}
          GROUP BY svs.status`,
            this.prisma.$queryRaw `
          SELECT count(*) AS count
          FROM student_vocabulary_states svs
          JOIN students s ON s.id = svs.student_id
          WHERE ${this.ownedStudentSql(teacherId)} AND ${DUE_CONDITION}`,
            this.prisma.vocabulary_senses.count(),
            this.prisma.vocabulary_review_history.count({
                where: {
                    students: {
                        is: { id: { in: await this.ownedStudentIds(teacherId) } },
                    },
                },
            }),
            this.reviewTrend(teacherId, undefined, 14),
        ]);
        const statusCounts = {
            ASSIGNED: 0,
            ENCOUNTERED: 0,
            LEARNING: 0,
            REVIEWING: 0,
            MASTERED: 0,
        };
        for (const row of statesAgg)
            statusCounts[row.status] = Number(row.count);
        const totalAssignedSenses = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        const recentSessions = await this.prisma.$queryRaw `
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
        se.correct_count AS "correct",
        se.incorrect_count AS "incorrect",
        (SELECT count(DISTINCT ev.vocabulary_sense_id) FROM activity_events ev
          WHERE ev.session_id = se.id
            AND ev.event_type IN ('ANSWER_CORRECT', 'ANSWER_INCORRECT')) AS "completed"
      FROM activity_sessions se
      JOIN activities a ON a.id = se.activity_id
      JOIN students st ON st.id = se.student_id
      WHERE a.teacher_id = ${teacherId}
      ORDER BY se.last_activity_at DESC
      LIMIT 12`;
        return {
            students: {
                total: Number(studentsAgg[0]?.total ?? 0),
                active: Number(studentsAgg[0]?.active ?? 0),
            },
            assignments: {
                total: Number(assignmentsAgg[0]?.total ?? 0),
                active: Number(assignmentsAgg[0]?.active ?? 0),
                overdue: Number(assignmentsAgg[0]?.overdue ?? 0),
            },
            activities: {
                total: Number(activitiesAgg[0]?.total ?? 0),
                active: Number(activitiesAgg[0]?.active ?? 0),
            },
            vocabulary: {
                catalogSenses: Number(catalog),
            },
            learning: {
                assigned: statusCounts.ASSIGNED,
                encountered: statusCounts.ENCOUNTERED,
                learning: statusCounts.LEARNING,
                reviewing: statusCounts.REVIEWING,
                mastered: statusCounts.MASTERED,
                dueNow: Number(dueAgg[0]?.count ?? 0),
                totalAssignedSenses,
                reviewsDone: Number(reviewsAgg),
            },
            recentSessions: recentSessions.map((r) => ({
                sessionId: Number(r.sessionId),
                studentId: Number(r.studentId),
                studentDisplayName: r.studentDisplayName,
                activityId: Number(r.activityId),
                activityTitle: r.activityTitle,
                activityType: r.activityType,
                status: r.status,
                startedAt: r.startedAt.toISOString(),
                finishedAt: r.finishedAt?.toISOString() ?? null,
                correct: Number(r.correct),
                incorrect: Number(r.incorrect),
                progress: r.totalItems === 0
                    ? 0
                    : Math.min(100, Math.round((Number(r.completed) / r.totalItems) * 100)),
            })),
            reviewTrend: trend,
        };
    }
    async students(teacherId, query) {
        const ownedIds = await this.ownedStudentIds(teacherId);
        if (ownedIds.length === 0)
            return [];
        const rows = await this.prisma.$queryRaw `
      SELECT
        st.id AS "studentId",
        st.display_name AS "displayName",
        st.is_active AS "isActive",
        st.created_at AS "createdAt",
        count(*) FILTER (WHERE svs.status = 'ASSIGNED') AS assigned,
        count(*) FILTER (WHERE svs.status = 'ENCOUNTERED') AS encountered,
        count(*) FILTER (WHERE svs.status = 'LEARNING') AS learning,
        count(*) FILTER (WHERE svs.status = 'REVIEWING') AS reviewing,
        count(*) FILTER (WHERE svs.status = 'MASTERED') AS mastered,
        count(*) FILTER (WHERE ${DUE_CONDITION}) AS due,
        (SELECT count(*) FROM vocabulary_review_history vh
          WHERE vh.student_id = st.id) AS "reviewsDone",
        (SELECT count(*) FROM activity_sessions ss
          WHERE ss.student_id = st.id) AS "sessionCount",
        (SELECT MAX(ss.last_activity_at) FROM activity_sessions ss
          WHERE ss.student_id = st.id) AS "lastActivityAt"
      FROM students st
      LEFT JOIN student_vocabulary_states svs ON svs.student_id = st.id
      WHERE st.id IN (${client_1.Prisma.join(ownedIds)})
        ${query.search ? client_1.Prisma.sql `AND st.display_name ILIKE ${`%${query.search.trim()}%`}` : client_1.Prisma.empty}
      GROUP BY st.id, st.display_name, st.is_active, st.created_at
      ORDER BY st.display_name ASC
      LIMIT ${query.limit ?? 500}`;
        return rows.map((r) => ({
            studentId: Number(r.studentId),
            displayName: r.displayName,
            isActive: r.isActive,
            createdAt: r.createdAt.toISOString(),
            assigned: Number(r.assigned),
            encountered: Number(r.encountered),
            learning: Number(r.learning),
            reviewing: Number(r.reviewing),
            mastered: Number(r.mastered),
            due: Number(r.due),
            totalAssignedSenses: Number(r.assigned) +
                Number(r.encountered) +
                Number(r.learning) +
                Number(r.reviewing) +
                Number(r.mastered),
            reviewsDone: Number(r.reviewsDone),
            sessionCount: Number(r.sessionCount),
            lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
        }));
    }
    async activities(teacherId, query) {
        const clauses = [client_1.Prisma.sql `a.teacher_id = ${teacherId}`];
        if (query.studentId !== undefined) {
            clauses.push(client_1.Prisma.sql `a.student_id = ${query.studentId}`);
        }
        if (query.activityType) {
            clauses.push(client_1.Prisma.sql `a.activity_type = ${query.activityType}`);
        }
        const dateClauses = [];
        if (query.from) {
            dateClauses.push(client_1.Prisma.sql `se.started_at >= ${new Date(query.from.length === 10 ? query.from + 'T00:00:00.000Z' : query.from)}`);
        }
        if (query.to) {
            const toDate = query.to.length === 10
                ? new Date(query.to + 'T23:59:59.999Z')
                : new Date(query.to);
            dateClauses.push(client_1.Prisma.sql `se.started_at <= ${toDate}`);
        }
        const rows = await this.prisma.$queryRaw `
      SELECT
        a.id AS "activityId",
        a.title AS "activityTitle",
        a.activity_type AS "activityType",
        a.status,
        st.id AS "studentId",
        st.display_name AS "studentDisplayName",
        count(DISTINCT se.id) AS "sessionCount",
        count(DISTINCT se.id) FILTER (WHERE se.status = 'FINISHED') AS "finishedCount",
        coalesce(sum(se.correct_count), 0) AS "totalCorrect",
        coalesce(sum(se.incorrect_count), 0) AS "totalIncorrect",
        CASE WHEN count(DISTINCT se.id) = 0 THEN 0 ELSE
          round(avg(
            CASE
              WHEN se.total_items = 0 THEN 0
              ELSE LEAST(100, (
                (SELECT count(DISTINCT ev.vocabulary_sense_id) FROM activity_events ev
                  WHERE ev.session_id = se.id
                    AND ev.event_type IN ('ANSWER_CORRECT', 'ANSWER_INCORRECT'))
                * 100.0 / se.total_items)
              )
            END
          )) END AS "avgPercentComplete",
        MAX(se.last_activity_at) AS "lastSessionAt"
      FROM activities a
      JOIN students st ON st.id = a.student_id
      LEFT JOIN activity_sessions se ON se.activity_id = a.id
      WHERE ${client_1.Prisma.join(clauses, ' AND ')}
      ${dateClauses.length > 0
            ? client_1.Prisma.sql `AND se.started_at IS NOT NULL AND ${client_1.Prisma.join(dateClauses, ' AND ')}`
            : client_1.Prisma.empty}
      GROUP BY a.id, a.title, a.activity_type, a.status, st.id, st.display_name
      ORDER BY MAX(se.last_activity_at) DESC NULLS LAST, a.id DESC
      LIMIT 500`;
        return rows.map((r) => ({
            activityId: Number(r.activityId),
            activityTitle: r.activityTitle,
            activityType: r.activityType,
            status: r.status,
            studentId: Number(r.studentId),
            studentDisplayName: r.studentDisplayName,
            sessionCount: Number(r.sessionCount),
            finishedCount: Number(r.finishedCount),
            totalCorrect: Number(r.totalCorrect),
            totalIncorrect: Number(r.totalIncorrect),
            avgPercentComplete: Number(r.avgPercentComplete ?? 0),
            lastSessionAt: r.lastSessionAt?.toISOString() ?? null,
        }));
    }
    async reviewTrend(teacherId, studentId, days = 30) {
        const ownedIds = await this.ownedStudentIds(teacherId);
        if (ownedIds.length === 0)
            return [];
        const studentClause = studentId === undefined
            ? client_1.Prisma.empty
            : client_1.Prisma.sql `AND vh.student_id = ${studentId}`;
        const rows = await this.prisma.$queryRaw `
      SELECT
        date_trunc('day', vh.reviewed_at) AS date,
        count(*) AS reviews,
        count(*) FILTER (WHERE vh.rating IN ('GOOD', 'EASY')) AS correct,
        count(*) FILTER (WHERE vh.rating IN ('AGAIN', 'HARD')) AS incorrect,
        count(*) FILTER (WHERE vh.rating IS NULL) AS ambiguous
      FROM vocabulary_review_history vh
      WHERE vh.student_id IN (${client_1.Prisma.join(ownedIds)})
        ${studentClause}
        AND vh.reviewed_at >= NOW() - (${days} || ' days')::interval
      GROUP BY date_trunc('day', vh.reviewed_at)
      ORDER BY date ASC`;
        const byDay = new Map();
        for (const row of rows) {
            const key = row.date.toISOString().slice(0, 10);
            byDay.set(key, {
                date: key,
                reviews: Number(row.reviews),
                correct: Number(row.correct),
                incorrect: Number(row.incorrect),
                ambiguous: Number(row.ambiguous),
            });
        }
        const points = [];
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);
        for (let i = 0; i < days; i += 1) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            points.push(byDay.get(key) ?? {
                date: key,
                reviews: 0,
                correct: 0,
                incorrect: 0,
                ambiguous: 0,
            });
        }
        return points;
    }
    async recentActivity(teacherId, limit = 30) {
        const ownedIds = await this.ownedStudentIds(teacherId);
        if (ownedIds.length === 0)
            return [];
        const rows = await this.prisma.$queryRaw `
      SELECT
        ev.id,
        ev.event_type AS "eventType",
        ev.occurred_at AS "occurredAt",
        st.id AS "studentId",
        st.display_name AS "studentDisplayName",
        a.title AS "activityTitle",
        a.activity_type AS "activityType",
        e.lemma,
        ev.response,
        ev.is_correct AS "isCorrect"
      FROM activity_events ev
      JOIN activities a ON a.id = ev.activity_id
      JOIN students st ON st.id = ev.student_id
      LEFT JOIN vocabulary_senses s ON s.id = ev.vocabulary_sense_id
      LEFT JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
      WHERE a.teacher_id = ${teacherId}
        AND ev.event_type IN (
          'ACTIVITY_STARTED', 'CARD_SHOWN', 'ANSWER_SUBMITTED',
          'ANSWER_CORRECT', 'ANSWER_INCORRECT', 'MATCH_FOUND',
          'MATCH_FAILED', 'QUESTION_COMPLETED', 'FINISHED')
      ORDER BY ev.occurred_at DESC
      LIMIT ${limit}`;
        return rows.map((r) => ({
            id: Number(r.id),
            eventType: r.eventType,
            occurredAt: r.occurredAt.toISOString(),
            studentId: Number(r.studentId),
            studentDisplayName: r.studentDisplayName,
            activityTitle: r.activityTitle,
            activityType: r.activityType,
            lemma: r.lemma,
            response: r.response,
            isCorrect: r.isCorrect,
        }));
    }
    async ownedStudentIds(teacherId) {
        const rows = await this.prisma.$queryRaw `
      SELECT DISTINCT s.id FROM students s
      WHERE ${this.ownedStudentSql(teacherId)}`;
        return rows.map((r) => Number(r.id));
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map