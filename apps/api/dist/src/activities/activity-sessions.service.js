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
exports.ActivitySessionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const page_meta_1 = require("../common/utils/page-meta");
const prisma_service_1 = require("../database/prisma.service");
const activity_events_service_1 = require("./activity-events.service");
const activity_items_helper_1 = require("./activity-items.helper");
const activity_learning_service_1 = require("./activity-learning.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const session_stats_helper_1 = require("./session-stats.helper");
const ANSWERABLE_TYPES = new Set(['ANSWER_CORRECT', 'ANSWER_INCORRECT']);
const EVENT_SENSE_SELECT = client_1.Prisma.sql `
SELECT
  ae.id,
  ae.session_id     AS "sessionId",
  ae.event_type     AS "eventType",
  ae.direction,
  ae.response,
  ae.is_correct     AS "isCorrect",
  ae.response_time_ms AS "responseTimeMs",
  ae.metadata,
  ae.occurred_at    AS "occurredAt",
  s.id              AS "senseId",
  e.lemma,
  e.part_of_speech  AS "partOfSpeech"
FROM activity_events ae
LEFT JOIN vocabulary_senses s ON s.id = ae.vocabulary_sense_id
LEFT JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
`;
let ActivitySessionsService = class ActivitySessionsService {
    prisma;
    eventsService;
    learning;
    realtime;
    constructor(prisma, eventsService, learning, realtime) {
        this.prisma = prisma;
        this.eventsService = eventsService;
        this.learning = learning;
        this.realtime = realtime;
    }
    async start(studentId, activityId) {
        const activity = await this.prisma.activities.findUnique({
            where: { id: BigInt(activityId) },
        });
        if (!activity || Number(activity.student_id) !== studentId) {
            throw new common_1.NotFoundException(`Activity ${activityId} not found`);
        }
        if (activity.status === 'DRAFT' || activity.status === 'CANCELLED') {
            throw new common_1.ForbiddenException('This activity is not available');
        }
        const itemCount = await this.prisma.activity_items.count({
            where: { activity_id: BigInt(activityId) },
        });
        if (itemCount === 0) {
            throw new common_1.BadRequestException('This activity has no vocabulary items');
        }
        const existing = await this.prisma.activity_sessions.findFirst({
            where: {
                activity_id: BigInt(activityId),
                student_id: BigInt(studentId),
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
            orderBy: { id: 'desc' },
        });
        if (existing) {
            const items = await (0, activity_items_helper_1.fetchActivitySenses)(this.prisma, activityId);
            return {
                session: await this.toActiveSessionDto(existing, activity),
                items,
            };
        }
        const now = new Date();
        const session = await this.prisma.$transaction(async (tx) => {
            const created = await tx.activity_sessions.create({
                data: {
                    activity_id: BigInt(activityId),
                    student_id: BigInt(studentId),
                    started_at: now,
                    last_activity_at: now,
                    status: 'ACTIVE',
                    total_items: itemCount,
                },
            });
            await this.eventsService.append(tx, {
                sessionId: Number(created.id),
                activityId,
                studentId,
                vocabularySenseId: null,
                eventType: 'ACTIVITY_STARTED',
                occurredAt: now,
            });
            return created;
        });
        const items = await (0, activity_items_helper_1.fetchActivitySenses)(this.prisma, activityId);
        const dto = await this.toActiveSessionDto(session, activity);
        this.emitMirror(dto, {
            eventType: 'ACTIVITY_STARTED',
            senseId: null,
            rating: null,
            direction: null,
            response: null,
            occurredAt: now,
        });
        return { session: dto, items };
    }
    async getForStudent(studentId, sessionId) {
        const session = await this.prisma.activity_sessions.findFirst({
            where: { id: BigInt(sessionId), student_id: BigInt(studentId) },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        const activity = await this.prisma.activities.findUnique({
            where: { id: session.activity_id },
        });
        return this.toActiveSessionDto(session, activity);
    }
    async pause(studentId, sessionId) {
        const session = await this.requireOwned(studentId, sessionId);
        if (session.status !== 'ACTIVE') {
            throw new common_1.ConflictException('Only an active session can be paused');
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.activity_sessions.update({
                where: { id: session.id },
                data: {
                    status: 'PAUSED',
                    paused_at: now,
                    last_activity_at: now,
                    updated_at: now,
                },
            });
            await this.eventsService.append(tx, {
                sessionId: Number(session.id),
                activityId: Number(session.activity_id),
                studentId,
                vocabularySenseId: null,
                eventType: 'PAUSED',
                occurredAt: now,
            });
        });
        const dto = await this.getForStudent(studentId, sessionId);
        this.emitMirror(dto, {
            eventType: 'PAUSED',
            senseId: null,
            rating: null,
            direction: null,
            response: null,
            occurredAt: now,
        });
        return dto;
    }
    async resume(studentId, sessionId) {
        const session = await this.requireOwned(studentId, sessionId);
        if (session.status !== 'PAUSED') {
            throw new common_1.ConflictException('Only a paused session can be resumed');
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.activity_sessions.update({
                where: { id: session.id },
                data: {
                    status: 'ACTIVE',
                    paused_at: null,
                    last_activity_at: now,
                    updated_at: now,
                },
            });
            await this.eventsService.append(tx, {
                sessionId: Number(session.id),
                activityId: Number(session.activity_id),
                studentId,
                vocabularySenseId: null,
                eventType: 'RESUMED',
                occurredAt: now,
            });
        });
        const dto = await this.getForStudent(studentId, sessionId);
        this.emitMirror(dto, {
            eventType: 'RESUMED',
            senseId: null,
            rating: null,
            direction: null,
            response: null,
            occurredAt: now,
        });
        return dto;
    }
    async finish(studentId, sessionId) {
        const session = await this.requireOwned(studentId, sessionId);
        if (session.status === 'FINISHED') {
            return this.getForStudent(studentId, sessionId);
        }
        if (session.status === 'ABANDONED') {
            throw new common_1.ConflictException('An abandoned session cannot be finished');
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.activity_sessions.update({
                where: { id: session.id },
                data: {
                    status: 'FINISHED',
                    finished_at: now,
                    paused_at: null,
                    last_activity_at: now,
                    updated_at: now,
                },
            });
            await this.eventsService.append(tx, {
                sessionId: Number(session.id),
                activityId: Number(session.activity_id),
                studentId,
                vocabularySenseId: null,
                eventType: 'FINISHED',
                occurredAt: now,
            });
        });
        const dto = await this.getForStudent(studentId, sessionId);
        this.emitMirror(dto, {
            eventType: 'FINISHED',
            senseId: null,
            rating: null,
            direction: null,
            response: null,
            occurredAt: now,
        });
        return dto;
    }
    async recordEvent(studentId, sessionId, dto) {
        activity_events_service_1.ActivityEventsService.assertPostable(dto.eventType);
        const session = await this.requireOwned(studentId, sessionId);
        if (session.status !== 'ACTIVE') {
            throw new common_1.ConflictException('Events can only be recorded during an active session');
        }
        const senseId = dto.vocabularySenseId;
        const activityId = Number(session.activity_id);
        if (senseId === undefined) {
            throw new common_1.BadRequestException(`Event type ${dto.eventType} requires a vocabularySenseId`);
        }
        if (!(await (0, activity_items_helper_1.senseIsInActivity)(this.prisma, activityId, senseId))) {
            throw new common_1.BadRequestException(`Sense ${senseId} does not belong to activity ${activityId}`);
        }
        const isAnswer = ANSWERABLE_TYPES.has(dto.eventType);
        if (dto.rating && !isAnswer) {
            throw new common_1.BadRequestException('A review rating is only accepted for ANSWER_CORRECT / ANSWER_INCORRECT events');
        }
        const inherentlyCorrect = dto.eventType === 'ANSWER_CORRECT' || dto.eventType === 'MATCH_FOUND';
        const inherentlyIncorrect = dto.eventType === 'ANSWER_INCORRECT' || dto.eventType === 'MATCH_FAILED';
        const normalizedCorrect = inherentlyCorrect
            ? true
            : inherentlyIncorrect
                ? false
                : (dto.isCorrect ?? null);
        if (dto.isCorrect !== undefined &&
            normalizedCorrect !== null &&
            dto.isCorrect !== normalizedCorrect) {
            throw new common_1.BadRequestException(`isCorrect conflicts with event type ${dto.eventType}`);
        }
        const item = await this.prisma.activity_items.findFirst({
            where: {
                activity_id: BigInt(activityId),
                vocabulary_sense_id: BigInt(senseId),
            },
            select: { position: true },
        });
        const existingMeta = session.metadata && typeof session.metadata === 'object'
            ? session.metadata
            : {};
        const nextMeta = dto.metadata?.liveState !== undefined
            ? { ...existingMeta, liveState: dto.metadata.liveState }
            : existingMeta;
        await this.prisma.$transaction(async (tx) => {
            await this.eventsService.append(tx, {
                sessionId: Number(session.id),
                activityId,
                studentId,
                vocabularySenseId: senseId,
                eventType: dto.eventType,
                direction: dto.direction ?? null,
                response: dto.response ?? null,
                isCorrect: normalizedCorrect,
                responseTimeMs: dto.responseTimeMs ?? null,
                metadata: dto.metadata ?? null,
            });
            const answer = (0, session_stats_helper_1.statsFor)(await (0, session_stats_helper_1.loadSessionAnswerStats)(tx, [session.id]), session.id);
            await tx.activity_sessions.update({
                where: { id: session.id },
                data: {
                    correct_count: answer.correct,
                    incorrect_count: answer.incorrect,
                    current_item_index: item ? item.position : undefined,
                    last_activity_at: new Date(),
                    updated_at: new Date(),
                    metadata: nextMeta,
                },
            });
            if (dto.rating) {
                await this.learning.applyAnswerReview(tx, studentId, senseId, dto.rating, dto.responseTimeMs ?? null, activityId);
            }
        });
        const current = await this.getForStudent(studentId, sessionId);
        this.emitMirror(current, {
            eventType: dto.eventType,
            senseId: dto.vocabularySenseId ?? null,
            rating: dto.rating ?? null,
            direction: dto.direction ?? null,
            response: dto.response ?? null,
            occurredAt: new Date(),
        });
        return current;
    }
    async listSessions(activityId) {
        const activity = await this.prisma.activities.findUnique({
            where: { id: BigInt(activityId) },
            select: { id: true },
        });
        if (!activity) {
            throw new common_1.NotFoundException(`Activity ${activityId} not found`);
        }
        const rows = await this.prisma.activity_sessions.findMany({
            where: { activity_id: BigInt(activityId) },
            orderBy: { started_at: 'desc' },
        });
        return this.mapSessionList(rows);
    }
    async getTeacherSession(sessionId) {
        const session = await this.prisma.activity_sessions.findUnique({
            where: { id: BigInt(sessionId) },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        const activity = await this.prisma.activities.findUnique({
            where: { id: session.activity_id },
        });
        return this.toActiveSessionDto(session, activity);
    }
    async events(sessionId, query) {
        const session = await this.prisma.activity_sessions.findUnique({
            where: { id: BigInt(sessionId) },
            select: { id: true },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        const [rows, total] = await Promise.all([
            this.prisma.$queryRaw(client_1.Prisma.sql `${EVENT_SENSE_SELECT}
          WHERE ae.session_id = ${sessionId}
          ORDER BY ae.occurred_at ASC, ae.id ASC
          LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`),
            this.prisma.activity_events.count({
                where: { session_id: BigInt(sessionId) },
            }),
        ]);
        return {
            data: rows.map((r) => ({
                id: Number(r.id),
                eventType: r.eventType,
                direction: r.direction,
                response: r.response,
                isCorrect: r.isCorrect,
                responseTimeMs: r.responseTimeMs === null ? null : Number(r.responseTimeMs),
                metadata: r.metadata ?? null,
                occurredAt: r.occurredAt.toISOString(),
                sense: r.senseId === null
                    ? null
                    : {
                        senseId: Number(r.senseId),
                        lemma: String(r.lemma),
                        partOfSpeech: String(r.partOfSpeech),
                    },
            })),
            meta: (0, page_meta_1.pageMeta)(query.page, query.limit, total),
        };
    }
    emitMirror(session, detail) {
        const meta = (session.metadata ?? {});
        const liveState = meta.liveState && typeof meta.liveState === 'object'
            ? meta.liveState
            : null;
        const payload = {
            kind: 'event',
            studentId: session.studentId,
            sessionId: session.id,
            activityId: session.activityId,
            activityTitle: session.activity?.title ?? null,
            activityType: session.activity?.activityType ?? null,
            status: session.status,
            eventType: detail.eventType,
            itemIndex: session.currentItemIndex,
            totalItems: session.totalItems,
            completedCount: session.completedCount,
            correctCount: session.correctCount,
            incorrectCount: session.incorrectCount,
            progress: session.percentComplete,
            senseId: detail.senseId,
            rating: detail.rating,
            direction: detail.direction,
            response: detail.response,
            liveState,
            occurredAt: detail.occurredAt.toISOString(),
        };
        this.realtime.emitSessionMirror(payload);
    }
    async requireOwned(studentId, sessionId) {
        const session = await this.prisma.activity_sessions.findFirst({
            where: { id: BigInt(sessionId), student_id: BigInt(studentId) },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        return session;
    }
    async mapSessionList(rows) {
        const ids = rows.map((r) => r.id);
        const stats = await (0, session_stats_helper_1.loadSessionAnswerStats)(this.prisma, ids);
        return rows.map((row) => {
            const answer = (0, session_stats_helper_1.statsFor)(stats, row.id);
            return {
                id: Number(row.id),
                status: row.status,
                startedAt: row.started_at.toISOString(),
                lastActivityAt: row.last_activity_at.toISOString(),
                finishedAt: row.finished_at?.toISOString() ?? null,
                pausedAt: row.paused_at?.toISOString() ?? null,
                currentItemIndex: row.current_item_index,
                totalItems: row.total_items,
                correctCount: answer.correct,
                incorrectCount: answer.incorrect,
                completedCount: answer.completed,
                percentComplete: (0, session_stats_helper_1.percentComplete)(answer.completed, row.total_items),
            };
        });
    }
    async toActiveSessionDto(session, activity) {
        const answer = (0, session_stats_helper_1.statsFor)(await (0, session_stats_helper_1.loadSessionAnswerStats)(this.prisma, [session.id]), session.id);
        return {
            id: Number(session.id),
            activityId: Number(session.activity_id),
            studentId: Number(session.student_id),
            status: session.status,
            startedAt: session.started_at.toISOString(),
            lastActivityAt: session.last_activity_at.toISOString(),
            finishedAt: session.finished_at?.toISOString() ?? null,
            pausedAt: session.paused_at?.toISOString() ?? null,
            currentItemIndex: session.current_item_index,
            totalItems: session.total_items,
            correctCount: answer.correct,
            incorrectCount: answer.incorrect,
            completedCount: answer.completed,
            percentComplete: (0, session_stats_helper_1.percentComplete)(answer.completed, session.total_items),
            answeredSenseIds: answer.answeredSenseIds,
            metadata: session.metadata ?? null,
            createdAt: session.created_at.toISOString(),
            updatedAt: session.updated_at.toISOString(),
            activity: activity
                ? {
                    id: Number(activity.id),
                    title: activity.title,
                    activityType: activity.activity_type,
                    status: activity.status,
                }
                : null,
        };
    }
};
exports.ActivitySessionsService = ActivitySessionsService;
exports.ActivitySessionsService = ActivitySessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_events_service_1.ActivityEventsService,
        activity_learning_service_1.ActivityLearningService,
        realtime_gateway_1.RealtimeGateway])
], ActivitySessionsService);
//# sourceMappingURL=activity-sessions.service.js.map