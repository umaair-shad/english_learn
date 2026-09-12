import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  LiveStudentDto,
  PresencePayload,
  PresenceRecord,
} from './realtime.types';

/**
 * Transient presence + ownership registry. Pure process-local state: nothing
 * here is persisted, so server restarts simply drop live mirrors (the teacher
 * page reloads its snapshot over HTTP -- which is the source of truth).
 */
@Injectable()
export class RealtimeService {
  private readonly presence = new Map<number, PresenceRecord>();

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------ presence

  setPresence(studentId: number, sessionId: number | null, socketId: string) {
    const now = new Date().toISOString();
    const existing = this.presence.get(studentId);
    const record: PresenceRecord = {
      studentId,
      online: true,
      sessionId,
      connectedAt: existing?.connectedAt ?? now,
      lastSeenAt: now,
      socketId,
    };
    this.presence.set(studentId, record);
    return this.toPayload(record);
  }

  touchPresence(studentId: number, socketId: string): PresenceRecord | null {
    const record = this.presence.get(studentId);
    if (!record || record.socketId !== socketId) return null;
    record.lastSeenAt = new Date().toISOString();
    return record;
  }

  clearPresence(studentId: number, socketId: string): PresenceRecord | null {
    const record = this.presence.get(studentId);
    if (!record || record.socketId !== socketId) return null;
    this.presence.delete(studentId);
    return record;
  }

  getPresence(studentId: number): PresencePayload | null {
    const record = this.presence.get(studentId);
    return record ? this.toPayload({ ...record, online: true }) : null;
  }

  // ------------------------------------------------------------ ownership

  /** A teacher owns a student when the teacher created an activity or an
   *  assignment for that student. This gates every live mirror subscription,
   *  so no teacher can observe (or even enumerate) another teacher's class. */
  async teacherOwnsStudent(
    teacherId: number,
    studentId: number,
  ): Promise<boolean> {
    const viaActivity = await this.prisma.activities.findFirst({
      where: {
        teacher_id: BigInt(teacherId),
        student_id: BigInt(studentId),
      },
      select: { id: true },
    });
    if (viaActivity) return true;
    const viaAssignment = await this.prisma.assignments.findFirst({
      where: {
        created_by_teacher_id: BigInt(teacherId),
        student_id: BigInt(studentId),
      },
      select: { id: true },
    });
    return viaAssignment !== null;
  }

  // ------------------------------------------------------------ snapshot

  /** Owned students with their current online status. Used for the HTTP
   *  initial load of the teacher live-monitoring page. */
  async liveSnapshot(
    teacherId: number,
    onlyOnline?: boolean,
  ): Promise<LiveStudentDto[]> {
    const owned = new Map<
      number,
      {
        id: number;
        firstName: string;
        lastName: string | null;
        displayName: string;
      }
    >();

    const [activities, assignments] = await Promise.all([
      this.prisma.activities.findMany({
        where: { teacher_id: BigInt(teacherId) },
        select: {
          student_id: true,
          students: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              display_name: true,
            },
          },
        },
        distinct: ['student_id'],
      }),
      this.prisma.assignments.findMany({
        where: { created_by_teacher_id: BigInt(teacherId) },
        select: {
          student_id: true,
          students: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              display_name: true,
            },
          },
        },
        distinct: ['student_id'],
      }),
    ]);

    for (const row of [...activities, ...assignments]) {
      const s = row.students;
      owned.set(Number(s.id), {
        id: Number(s.id),
        firstName: s.first_name,
        lastName: s.last_name,
        displayName: s.display_name,
      });
    }

    const result: LiveStudentDto[] = [];
    for (const student of owned.values()) {
      const presence = this.presence.get(student.id);
      const online = presence?.online === true;
      if (onlyOnline && !online) continue;
      result.push({
        studentId: student.id,
        displayName: student.displayName,
        firstName: student.firstName,
        lastName: student.lastName,
        online,
        sessionId: presence?.sessionId ?? null,
        connectedAt: presence?.connectedAt ?? null,
        lastSeenAt: presence?.lastSeenAt ?? null,
      });
    }

    result.sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()),
    );
    return result;
  }

  // ------------------------------------------------------------ private

  private toPayload(record: PresenceRecord): PresencePayload {
    return {
      studentId: record.studentId,
      online: true,
      sessionId: record.sessionId,
      connectedAt: record.connectedAt,
      lastSeenAt: record.lastSeenAt,
    };
  }
}
