import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ActivityEventsService } from './activity-events.service';
import {
  fetchActivitySenses,
  senseIsInActivity,
} from './activity-items.helper';
import { ActivityLearningService } from './activity-learning.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { MirrorPayload } from '../realtime/realtime.types';
import { CreateEventDto, SessionEventListQueryDto } from './dto/activities.dto';
import type { ActivityItemShape } from './activity-items.helper';

export interface ActivitySessionDto {
  id: number;
  activityId: number;
  studentId: number;
  status: string;
  startedAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
  pausedAt: string | null;
  currentItemIndex: number | null;
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  percentComplete: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  activity: {
    id: number;
    title: string;
    activityType: string;
    status: string;
  } | null;
}

export interface SessionListItemDto {
  id: number;
  status: string;
  startedAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
  pausedAt: string | null;
  currentItemIndex: number | null;
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  percentComplete: number;
}

export interface SessionEventListItemDto {
  id: number;
  eventType: string;
  direction: string | null;
  response: string | null;
  isCorrect: boolean | null;
  responseTimeMs: number | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  sense: { senseId: number; lemma: string; partOfSpeech: string } | null;
}

const ANSWERABLE_TYPES = new Set(['ANSWER_CORRECT', 'ANSWER_INCORRECT']);

interface RawSessionEvent {
  id: bigint;
  eventType: string;
  direction: string | null;
  response: string | null;
  isCorrect: boolean | null;
  responseTimeMs: number | null;
  metadata: unknown;
  occurredAt: Date;
  senseId: bigint | null;
  lemma: string | null;
  partOfSpeech: string | null;
}

const EVENT_SENSE_SELECT = Prisma.sql`
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

@Injectable()
export class ActivitySessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: ActivityEventsService,
    private readonly learning: ActivityLearningService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ------------------------------------------------------ student lifecycle

  /**
   * Starts or resumes a session. A non-finished session for the same activity
   * is returned as-is (resume); only one session can be in flight. Otherwise a
   * fresh session is created and an ACTIVITY_STARTED event is appended inside
   * the same transaction.
   */
  async start(
    studentId: number,
    activityId: number,
  ): Promise<{
    session: ActivitySessionDto;
    items: ActivityItemShape[];
  }> {
    const activity = await this.prisma.activities.findUnique({
      where: { id: BigInt(activityId) },
    });
    if (!activity || Number(activity.student_id) !== studentId) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }
    if (activity.status === 'DRAFT' || activity.status === 'CANCELLED') {
      throw new ForbiddenException('This activity is not available');
    }
    const itemCount = await this.prisma.activity_items.count({
      where: { activity_id: BigInt(activityId) },
    });
    if (itemCount === 0) {
      throw new BadRequestException('This activity has no vocabulary items');
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
      const items = await fetchActivitySenses(this.prisma, activityId);
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

    const items = await fetchActivitySenses(this.prisma, activityId);
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

  async getForStudent(
    studentId: number,
    sessionId: number,
  ): Promise<ActivitySessionDto> {
    const session = await this.prisma.activity_sessions.findFirst({
      where: { id: BigInt(sessionId), student_id: BigInt(studentId) },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const activity = await this.prisma.activities.findUnique({
      where: { id: session.activity_id },
    });
    return this.toActiveSessionDto(session, activity);
  }

  async pause(
    studentId: number,
    sessionId: number,
  ): Promise<ActivitySessionDto> {
    const session = await this.requireOwned(studentId, sessionId);
    if (session.status !== 'ACTIVE') {
      throw new ConflictException('Only an active session can be paused');
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

  async resume(
    studentId: number,
    sessionId: number,
  ): Promise<ActivitySessionDto> {
    const session = await this.requireOwned(studentId, sessionId);
    if (session.status !== 'PAUSED') {
      throw new ConflictException('Only a paused session can be resumed');
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

  async finish(
    studentId: number,
    sessionId: number,
  ): Promise<ActivitySessionDto> {
    const session = await this.requireOwned(studentId, sessionId);
    if (session.status === 'FINISHED') {
      return this.getForStudent(studentId, sessionId);
    }
    if (session.status === 'ABANDONED') {
      throw new ConflictException('An abandoned session cannot be finished');
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

  /** Generic event endpoint. Never accepts a studentId from the body. */
  async recordEvent(
    studentId: number,
    sessionId: number,
    dto: CreateEventDto,
  ): Promise<ActivitySessionDto> {
    ActivityEventsService.assertPostable(dto.eventType);
    const session = await this.requireOwned(studentId, sessionId);
    if (session.status !== 'ACTIVE') {
      throw new ConflictException(
        'Events can only be recorded during an active session',
      );
    }

    const senseId = dto.vocabularySenseId;
    const activityId = Number(session.activity_id);
    if (senseId === undefined) {
      throw new BadRequestException(
        `Event type ${dto.eventType} requires a vocabularySenseId`,
      );
    }
    if (!(await senseIsInActivity(this.prisma, activityId, senseId))) {
      throw new BadRequestException(
        `Sense ${senseId} does not belong to activity ${activityId}`,
      );
    }

    const isAnswer = ANSWERABLE_TYPES.has(dto.eventType);
    if (dto.rating && !isAnswer) {
      throw new BadRequestException(
        'A review rating is only accepted for ANSWER_CORRECT / ANSWER_INCORRECT events',
      );
    }
    const inherentlyCorrect =
      dto.eventType === 'ANSWER_CORRECT' || dto.eventType === 'MATCH_FOUND';
    const inherentlyIncorrect =
      dto.eventType === 'ANSWER_INCORRECT' || dto.eventType === 'MATCH_FAILED';
    const normalizedCorrect = inherentlyCorrect
      ? true
      : inherentlyIncorrect
        ? false
        : (dto.isCorrect ?? null);
    if (
      dto.isCorrect !== undefined &&
      normalizedCorrect !== null &&
      dto.isCorrect !== normalizedCorrect
    ) {
      throw new BadRequestException(
        `isCorrect conflicts with event type ${dto.eventType}`,
      );
    }

    const item = await this.prisma.activity_items.findFirst({
      where: {
        activity_id: BigInt(activityId),
        vocabulary_sense_id: BigInt(senseId),
      },
      select: { position: true },
    });

    const existingMeta =
      session.metadata && typeof session.metadata === 'object'
        ? (session.metadata as Record<string, unknown>)
        : {};
    const nextMeta =
      dto.metadata?.liveState !== undefined
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

      await tx.activity_sessions.update({
        where: { id: session.id },
        data: {
          correct_count:
            dto.eventType === 'ANSWER_CORRECT' ? { increment: 1 } : undefined,
          incorrect_count:
            dto.eventType === 'ANSWER_INCORRECT' ? { increment: 1 } : undefined,
          current_item_index: item ? item.position : undefined,
          last_activity_at: new Date(),
          updated_at: new Date(),
          metadata: nextMeta as Prisma.InputJsonValue,
        },
      });

      if (dto.rating) {
        await this.learning.applyAnswerReview(
          tx,
          studentId,
          senseId,
          dto.rating,
          dto.responseTimeMs ?? null,
          activityId,
        );
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

  // ------------------------------------------------------------ teacher reads

  async listSessions(activityId: number): Promise<SessionListItemDto[]> {
    const activity = await this.prisma.activities.findUnique({
      where: { id: BigInt(activityId) },
      select: { id: true },
    });
    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }
    const rows = await this.prisma.activity_sessions.findMany({
      where: { activity_id: BigInt(activityId) },
      orderBy: { started_at: 'desc' },
    });
    return this.mapSessionList(rows);
  }

  async getTeacherSession(sessionId: number): Promise<ActivitySessionDto> {
    const session = await this.prisma.activity_sessions.findUnique({
      where: { id: BigInt(sessionId) },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const activity = await this.prisma.activities.findUnique({
      where: { id: session.activity_id },
    });
    return this.toActiveSessionDto(session, activity);
  }

  async events(
    sessionId: number,
    query: SessionEventListQueryDto,
  ): Promise<{
    data: SessionEventListItemDto[];
    meta: { page: number; limit: number; total: number };
  }> {
    const session = await this.prisma.activity_sessions.findUnique({
      where: { id: BigInt(sessionId) },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<RawSessionEvent[]>(
        Prisma.sql`${EVENT_SENSE_SELECT}
          WHERE ae.session_id = ${sessionId}
          ORDER BY ae.occurred_at ASC, ae.id ASC
          LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      ),
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
        responseTimeMs:
          r.responseTimeMs === null ? null : Number(r.responseTimeMs),
        metadata: (r.metadata as Record<string, unknown> | null) ?? null,
        occurredAt: r.occurredAt.toISOString(),
        sense:
          r.senseId === null
            ? null
            : {
                senseId: Number(r.senseId),
                lemma: String(r.lemma),
                partOfSpeech: String(r.partOfSpeech),
              },
      })),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  // ---------------------------------------------------------------- private

  /** Broadcast an observation-only mirror snapshot after a DB write. The
   *  payload is derived exclusively from the persisted session state, so the
   *  socket channel carries no authoritative data of its own. */
  private emitMirror(
    session: ActivitySessionDto,
    detail: {
      eventType: string;
      senseId: number | null;
      rating: string | null;
      direction: string | null;
      response: string | null;
      occurredAt: Date;
    },
  ): void {
    const meta = (session.metadata ?? {}) as Record<string, unknown>;
    const liveState =
      meta.liveState && typeof meta.liveState === 'object'
        ? (meta.liveState as Record<string, unknown>)
        : null;
    const payload: MirrorPayload = {
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

  private async requireOwned(studentId: number, sessionId: number) {
    const session = await this.prisma.activity_sessions.findFirst({
      where: { id: BigInt(sessionId), student_id: BigInt(studentId) },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  private async mapSessionList(
    rows: Array<{
      id: bigint;
      status: string;
      started_at: Date;
      last_activity_at: Date;
      finished_at: Date | null;
      paused_at: Date | null;
      current_item_index: number | null;
      total_items: number;
      correct_count: number;
      incorrect_count: number;
    }>,
  ): Promise<SessionListItemDto[]> {
    const ids = rows.map((r) => r.id);
    const completed = await this.loadCompletedCounts(ids);
    return rows.map((row) => {
      const done = completed.get(row.id) ?? 0;
      return {
        id: Number(row.id),
        status: row.status,
        startedAt: row.started_at.toISOString(),
        lastActivityAt: row.last_activity_at.toISOString(),
        finishedAt: row.finished_at?.toISOString() ?? null,
        pausedAt: row.paused_at?.toISOString() ?? null,
        currentItemIndex: row.current_item_index,
        totalItems: row.total_items,
        correctCount: Number(row.correct_count),
        incorrectCount: Number(row.incorrect_count),
        completedCount: Number(done),
        percentComplete:
          row.total_items === 0
            ? 0
            : Math.min(100, Math.round((Number(done) / row.total_items) * 100)),
      };
    });
  }

  private async loadCompletedCounts(
    sessionIds: bigint[],
  ): Promise<Map<bigint, number>> {
    if (sessionIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      Array<{ sessionId: bigint; completed: bigint }>
    >(
      Prisma.sql`SELECT session_id AS "sessionId",
                 count(DISTINCT vocabulary_sense_id) AS completed
        FROM activity_events
        WHERE session_id IN (${Prisma.join(sessionIds)})
          AND event_type IN ('ANSWER_CORRECT', 'ANSWER_INCORRECT')
        GROUP BY session_id`,
    );
    const map = new Map<bigint, number>();
    for (const row of rows) map.set(row.sessionId, Number(row.completed));
    return map;
  }

  private async toActiveSessionDto(
    session: {
      id: bigint;
      activity_id: bigint;
      student_id: bigint;
      status: string;
      started_at: Date;
      last_activity_at: Date;
      finished_at: Date | null;
      paused_at: Date | null;
      current_item_index: number | null;
      total_items: number;
      correct_count: number;
      incorrect_count: number;
      metadata: Prisma.JsonValue;
      created_at: Date;
      updated_at: Date;
    },
    activity: {
      id: bigint;
      title: string;
      activity_type: string;
      status: string;
    } | null,
  ): Promise<ActivitySessionDto> {
    const completed =
      (await this.loadCompletedCounts([session.id])).get(session.id) ?? 0;
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
      correctCount: Number(session.correct_count),
      incorrectCount: Number(session.incorrect_count),
      completedCount: completed,
      percentComplete:
        session.total_items === 0
          ? 0
          : Math.min(100, Math.round((completed / session.total_items) * 100)),
      metadata: (session.metadata as Record<string, unknown> | null) ?? null,
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
}
