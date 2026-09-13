import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageMeta } from '../common/utils/page-meta';
import { PrismaService } from '../database/prisma.service';
import {
  fetchActivitySenses,
  type ActivityItemShape,
} from './activity-items.helper';
import {
  loadSessionAnswerStats,
  percentComplete,
  statsFor,
} from './session-stats.helper';
import {
  ActivityQueryDto,
  CreateActivityDto,
  UpdateActivityDto,
} from './dto/activities.dto';

export interface ActivityListItemDto {
  id: number;
  studentId: number;
  assignmentId: number | null;
  title: string;
  description: string | null;
  activityType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  student: { id: number; displayName: string; firstName: string };
  assignment: { id: number; title: string; status: string } | null;
  itemCount: number;
  latestSession: LatestSessionDto | null;
}

export interface LatestSessionDto {
  id: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  totalItems: number;
  corrected: number;
  incorrect: number;
  completed: number;
  percentComplete: number;
}

export interface ActivityDetailDto {
  id: number;
  studentId: number;
  assignmentId: number | null;
  title: string;
  description: string | null;
  activityType: string;
  status: string;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: number;
    displayName: string;
    firstName: string;
    isActive: boolean;
  };
  assignment: { id: number; title: string; status: string } | null;
  itemCount: number;
  sessionCount: number;
  items: ActivityItemShape[];
}

interface SessionRow {
  activityId: bigint;
  sessionId: bigint;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  totalItems: number;
  correct: number;
  incorrect: number;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ActivityQueryDto): Promise<{
    data: ActivityListItemDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.activitiesWhereInput = {};
    if (query.studentId !== undefined)
      where.student_id = BigInt(query.studentId);
    if (query.assignmentId !== undefined) {
      where.assignment_id = BigInt(query.assignmentId);
    }
    if (query.activityType) where.activity_type = query.activityType;
    if (query.status) where.status = query.status;
    if (query.search && query.search.trim().length > 0) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.activities.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          students: {
            select: { id: true, display_name: true, first_name: true },
          },
          assignments: { select: { id: true, title: true, status: true } },
          _count: { select: { activity_items: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.activities.count({ where }),
    ]);

    const ids = rows.map((r) => r.id);
    const sessions = await this.loadLatestSessions(ids);
    const stats = await loadSessionAnswerStats(
      this.prisma,
      [...sessions.values()].map((s) => s.sessionId),
    );

    return {
      data: rows.map((row) => {
        const latest = sessions.get(row.id) ?? null;
        const progress = this.toLatestSessionDto(latest, stats);
        return {
          id: Number(row.id),
          studentId: Number(row.student_id),
          assignmentId:
            row.assignment_id === null ? null : Number(row.assignment_id),
          title: row.title,
          description: row.description,
          activityType: row.activity_type,
          status: row.status,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          student: {
            id: Number(row.students.id),
            displayName: row.students.display_name,
            firstName: row.students.first_name,
          },
          assignment: row.assignments
            ? {
                id: Number(row.assignments.id),
                title: row.assignments.title,
                status: row.assignments.status,
              }
            : null,
          itemCount: row._count.activity_items,
          latestSession: progress,
        };
      }),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  /**
   * Token-facing list for a student's dashboard (no pagination, no teacher
   * identity needed). Never exposes another student's activities.
   */
  async listForStudent(studentId: number): Promise<ActivityListItemDto[]> {
    const rows = await this.prisma.activities.findMany({
      where: { student_id: BigInt(studentId) },
      orderBy: { created_at: 'desc' },
      include: {
        students: {
          select: { id: true, display_name: true, first_name: true },
        },
        assignments: { select: { id: true, title: true, status: true } },
        _count: { select: { activity_items: true } },
      },
    });
    const ids = rows.map((r) => r.id);
    const sessions = await this.loadLatestSessions(ids);
    const stats = await loadSessionAnswerStats(
      this.prisma,
      [...sessions.values()].map((s) => s.sessionId),
    );

    return rows.map((row) => {
      const latest = sessions.get(row.id) ?? null;
      return {
        id: Number(row.id),
        studentId: Number(row.student_id),
        assignmentId:
          row.assignment_id === null ? null : Number(row.assignment_id),
        title: row.title,
        description: row.description,
        activityType: row.activity_type,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        student: {
          id: Number(row.students.id),
          displayName: row.students.display_name,
          firstName: row.students.first_name,
        },
        assignment: row.assignments
          ? {
              id: Number(row.assignments.id),
              title: row.assignments.title,
              status: row.assignments.status,
            }
          : null,
        itemCount: row._count.activity_items,
        latestSession: this.toLatestSessionDto(latest, stats),
      };
    });
  }

  async getById(id: number): Promise<ActivityDetailDto> {
    const activity = await this.prisma.activities.findUnique({
      where: { id: BigInt(id) },
      include: {
        students: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            is_active: true,
          },
        },
        assignments: { select: { id: true, title: true, status: true } },
        _count: { select: { activity_items: true, activity_sessions: true } },
      },
    });
    if (!activity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    const items = await fetchActivitySenses(this.prisma, id);
    return {
      id: Number(activity.id),
      studentId: Number(activity.student_id),
      assignmentId:
        activity.assignment_id === null ? null : Number(activity.assignment_id),
      title: activity.title,
      description: activity.description,
      activityType: activity.activity_type,
      status: activity.status,
      settings: (activity.settings as Record<string, unknown> | null) ?? null,
      createdAt: activity.created_at.toISOString(),
      updatedAt: activity.updated_at.toISOString(),
      student: {
        id: Number(activity.students.id),
        displayName: activity.students.display_name,
        firstName: activity.students.first_name,
        isActive: activity.students.is_active,
      },
      assignment: activity.assignments
        ? {
            id: Number(activity.assignments.id),
            title: activity.assignments.title,
            status: activity.assignments.status,
          }
        : null,
      itemCount: activity._count.activity_items,
      sessionCount: activity._count.activity_sessions,
      items,
    };
  }

  /** Activity summary for the student token page: metadata + item count. */
  async summaryForStudent(
    studentId: number,
    activityId: number,
  ): Promise<ActivityDetailDto> {
    const detail = await this.getById(activityId);
    if (detail.studentId !== studentId) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }
    return detail;
  }

  async create(
    teacherId: number,
    dto: CreateActivityDto,
  ): Promise<{ id: number }> {
    const id = await this.prisma.$transaction(async (tx) => {
      const student = await tx.students.findUnique({
        where: { id: BigInt(dto.studentId) },
        select: { id: true, is_active: true },
      });
      if (!student) {
        throw new NotFoundException(`Student ${dto.studentId} not found`);
      }
      if (!student.is_active) {
        throw new BadRequestException(
          'Cannot create an activity for a deactivated student',
        );
      }

      const senses = await this.resolveSenses(tx, dto);

      const activity = await tx.activities.create({
        data: {
          teacher_id: BigInt(teacherId),
          student_id: BigInt(dto.studentId),
          assignment_id: dto.assignmentId ? BigInt(dto.assignmentId) : null,
          title: dto.title,
          description: dto.description ?? null,
          activity_type: dto.activityType,
          status: 'ACTIVE',
          settings: (dto.settings as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      await tx.activity_items.createMany({
        data: senses.map((senseId, index) => ({
          activity_id: activity.id,
          vocabulary_sense_id: BigInt(senseId),
          position: index + 1,
        })),
      });

      return Number(activity.id);
    });
    return { id };
  }

  async update(id: number, dto: UpdateActivityDto): Promise<ActivityDetailDto> {
    const existing = await this.prisma.activities.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled activity');
    }

    const data: Prisma.activitiesUpdateInput = { updated_at: new Date() };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.settings !== undefined) {
      data.settings = dto.settings as Prisma.InputJsonValue;
    }
    if (dto.status !== undefined) data.status = dto.status;

    await this.prisma.activities.update({
      where: { id: BigInt(id) },
      data,
    });
    return this.getById(id);
  }

  /**
   * Soft-cancel when sessions/events exist, otherwise delete. Returning an
   * activity to a CANCELLED state is idempotent.
   */
  async remove(id: number): Promise<{ id: number; cancelled: boolean }> {
    const existing = await this.prisma.activities.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    if (existing.status === 'CANCELLED') {
      return { id, cancelled: true };
    }

    const sessionCount = await this.prisma.activity_sessions.count({
      where: { activity_id: BigInt(id) },
    });
    if (sessionCount > 0) {
      await this.prisma.activities.update({
        where: { id: BigInt(id) },
        data: { status: 'CANCELLED', updated_at: new Date() },
      });
      return { id, cancelled: true };
    }

    await this.prisma.activities.delete({ where: { id: BigInt(id) } });
    return { id, cancelled: false };
  }

  // ---------------------------------------------------------------- private

  private async resolveSenses(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
  ): Promise<number[]> {
    if (dto.assignmentId) {
      const assignment = await tx.assignments.findUnique({
        where: { id: BigInt(dto.assignmentId) },
      });
      if (!assignment) {
        throw new NotFoundException(`Assignment ${dto.assignmentId} not found`);
      }
      if (assignment.student_id !== BigInt(dto.studentId)) {
        throw new BadRequestException(
          `Assignment ${dto.assignmentId} does not belong to student ${dto.studentId}`,
        );
      }
      const items = await tx.assignment_items.findMany({
        where: { assignment_id: BigInt(dto.assignmentId) },
        orderBy: { id: 'asc' },
        select: { vocabulary_sense_id: true },
      });
      if (items.length === 0) {
        throw new BadRequestException('Assignment has no senses to build from');
      }
      const base = items.map((i) => Number(i.vocabulary_sense_id));

      if (dto.senseIds && dto.senseIds.length > 0) {
        const allowed = new Set(base);
        for (const senseId of dto.senseIds) {
          if (!allowed.has(senseId)) {
            throw new BadRequestException(
              `Sense ${senseId} is not part of assignment ${dto.assignmentId}`,
            );
          }
        }
        const chosen = base.filter((senseId) =>
          dto.senseIds!.includes(senseId),
        );
        if (chosen.length === 0) {
          throw new BadRequestException('No assignment senses selected');
        }
        return chosen;
      }
      if (dto.itemCount !== undefined) {
        return base.slice(0, dto.itemCount);
      }
      return base;
    }

    const selection = dto.selection ?? (dto.vocabularySetId ? 'set' : 'manual');
    if (selection === 'set' || dto.vocabularySetId) {
      return this.resolveFromSet(tx, dto);
    }
    if (
      selection === 'assigned' ||
      selection === 'due' ||
      selection === 'difficult' ||
      selection === 'catalog'
    ) {
      return this.resolveFromStudentPool(tx, dto, selection);
    }

    if (!dto.senseIds || dto.senseIds.length === 0) {
      throw new BadRequestException(
        'Provide an assignment, a vocabulary set, a student pool, or a list of vocabulary senses',
      );
    }
    const unique = [...new Set(dto.senseIds)];
    const found = await tx.vocabulary_senses.findMany({
      where: { id: { in: unique.map((id) => BigInt(id)) } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((f) => Number(f.id)));
    const missing = unique.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Vocabulary senses not found: ${missing.join(', ')}`,
      );
    }
    return unique;
  }

  private async resolveFromSet(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
  ): Promise<number[]> {
    if (!dto.vocabularySetId) {
      throw new BadRequestException('vocabularySetId is required for set selection');
    }
    const set = await tx.vocabulary_sets.findUnique({
      where: { id: BigInt(dto.vocabularySetId) },
      select: { id: true, is_active: true },
    });
    if (!set || !set.is_active) {
      throw new NotFoundException(`Vocabulary set ${dto.vocabularySetId} not found`);
    }
    const items = await tx.vocabulary_set_items.findMany({
      where: { vocabulary_set_id: set.id },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { vocabulary_sense_id: true },
    });
    if (items.length === 0) {
      throw new BadRequestException('Vocabulary set has no senses');
    }
    const ids = items.map((i) => Number(i.vocabulary_sense_id));
    return dto.itemCount ? ids.slice(0, dto.itemCount) : ids;
  }

  private async resolveFromStudentPool(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
    selection: 'assigned' | 'due' | 'difficult' | 'catalog',
  ): Promise<number[]> {
    const limit = dto.itemCount ?? 20;
    const extra: Prisma.Sql[] = [];
    if (dto.cefr) {
      extra.push(Prisma.sql`EXISTS (
        SELECT 1 FROM cefr_assignments c
        WHERE c.vocabulary_sense_id = s.id AND c.level = ${dto.cefr}
      )`);
    }
    if (dto.category && dto.category.trim()) {
      const pattern = `%${dto.category.trim()}%`;
      extra.push(Prisma.sql`EXISTS (
        SELECT 1 FROM vocabulary_category_assignments vca
        JOIN categories cat ON cat.id = vca.category_id
        WHERE vca.vocabulary_sense_id = s.id
          AND (cat.code ILIKE ${pattern} OR cat.name ILIKE ${pattern})
      )`);
    }
    if (dto.partOfSpeech) {
      extra.push(Prisma.sql`e.part_of_speech = ${dto.partOfSpeech}`);
    }
    const extraSql =
      extra.length > 0
        ? Prisma.sql`AND ${Prisma.join(extra, ' AND ')}`
        : Prisma.empty;

    let rows: Array<{ id: bigint }>;
    if (selection === 'catalog') {
      rows = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT s.id
        FROM vocabulary_senses s
        JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
        WHERE TRUE ${extraSql}
        ORDER BY e.normalized_lemma ASC, s.position ASC
        LIMIT ${limit}`;
    } else if (selection === 'assigned') {
      rows = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT s.id
        FROM student_vocabulary_states svs
        JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
        JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
        WHERE svs.student_id = ${dto.studentId}
          AND svs.status IN ('ASSIGNED', 'ENCOUNTERED', 'LEARNING', 'REVIEWING')
          ${extraSql}
        ORDER BY svs.updated_at DESC
        LIMIT ${limit}`;
    } else if (selection === 'due') {
      rows = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT s.id
        FROM student_vocabulary_states svs
        JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
        JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
        WHERE svs.student_id = ${dto.studentId}
          AND (
            svs.status = 'ENCOUNTERED'
            OR (svs.status IN ('LEARNING', 'REVIEWING')
                AND (svs.next_review_at IS NULL OR svs.next_review_at <= NOW()))
            OR (svs.status = 'MASTERED'
                AND svs.next_review_at IS NOT NULL AND svs.next_review_at <= NOW())
          )
          ${extraSql}
        ORDER BY svs.next_review_at ASC NULLS FIRST
        LIMIT ${limit}`;
    } else {
      rows = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT s.id
        FROM student_vocabulary_states svs
        JOIN vocabulary_senses s ON s.id = svs.vocabulary_sense_id
        JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
        WHERE svs.student_id = ${dto.studentId}
          AND (svs.incorrect_count > svs.correct_count OR svs.lapses >= 2)
          ${extraSql}
        ORDER BY svs.incorrect_count DESC, svs.lapses DESC
        LIMIT ${limit}`;
    }
    if (rows.length === 0) {
      throw new BadRequestException(
        `No vocabulary matched the ${selection} selection`,
      );
    }
    return rows.map((r) => Number(r.id));
  }

  private async loadLatestSessions(
    activityIds: bigint[],
  ): Promise<Map<bigint, SessionRow>> {
    if (activityIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<SessionRow[]>(
      Prisma.sql`WITH ranked AS (
          SELECT
            activity_id AS "activityId",
            id AS "sessionId",
            status,
            started_at AS "startedAt",
            finished_at AS "finishedAt",
            total_items AS "totalItems",
            correct_count AS "correct",
            incorrect_count AS "incorrect",
            row_number() OVER (
              PARTITION BY activity_id ORDER BY id DESC
            ) AS rn
          FROM activity_sessions
          WHERE activity_id IN (${Prisma.join(activityIds)})
        )
        SELECT "activityId", "sessionId", status,
               "startedAt", "finishedAt", "totalItems", "correct", "incorrect"
        FROM ranked
        WHERE rn = 1`,
    );
    return new Map(rows.map((row) => [row.activityId, row]));
  }

  private toLatestSessionDto(
    session: SessionRow | undefined | null,
    stats: Awaited<ReturnType<typeof loadSessionAnswerStats>>,
  ): LatestSessionDto | null {
    if (!session) return null;
    const answer = statsFor(stats, session.sessionId);
    return {
      id: Number(session.sessionId),
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      finishedAt: session.finishedAt?.toISOString() ?? null,
      totalItems: session.totalItems,
      corrected: answer.correct,
      incorrect: answer.incorrect,
      completed: answer.completed,
      percentComplete: percentComplete(answer.completed, session.totalItems),
    };
  }
}
