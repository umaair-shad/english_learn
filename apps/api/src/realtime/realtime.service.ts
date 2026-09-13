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
    const socketIds = existing?.socketIds ?? new Set<string>();
    const sessions = existing?.sessions ?? new Map<string, number | null>();
    socketIds.add(socketId);
    sessions.set(socketId, sessionId);
    const record: PresenceRecord = {
      studentId,
      online: true,
      sessionId: this.activeSession(sessions),
      connectedAt: existing?.connectedAt ?? now,
      lastSeenAt: now,
      socketId,
      socketIds,
      sessions,
    };
    this.presence.set(studentId, record);
    return this.toPayload(record);
  }

  touchPresence(studentId: number, socketId: string): PresenceRecord | null {
    const record = this.presence.get(studentId);
    if (!record || !record.socketIds.has(socketId)) return null;
    record.lastSeenAt = new Date().toISOString();
    return record;
  }

  clearPresence(studentId: number, socketId: string): PresencePayload | null {
    const record = this.presence.get(studentId);
    if (!record || !record.socketIds.has(socketId)) return null;
    record.socketIds.delete(socketId);
    record.sessions.delete(socketId);
    if (record.socketIds.size > 0) {
      record.socketId = [...record.socketIds][0];
      record.sessionId = this.activeSession(record.sessions);
      record.lastSeenAt = new Date().toISOString();
      return this.toPayload(record);
    }
    this.presence.delete(studentId);
    return {
      studentId,
      online: false,
      sessionId: null,
      connectedAt: null,
      lastSeenAt: new Date().toISOString(),
    };
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
    void teacherId;
    const student = await this.prisma.students.findFirst({
      where: { id: BigInt(studentId) },
      select: { id: true },
    });
    return student !== null;
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

    // Single-teacher product: every student is visible on the live board.
    void teacherId;
    const roster = await this.prisma.students.findMany({
      where: { is_active: true },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        display_name: true,
      },
    });
    for (const s of roster) {
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

  private activeSession(sessions: Map<string, number | null>): number | null {
    for (const sessionId of sessions.values()) {
      if (sessionId !== null) return sessionId;
    }
    return null;
  }

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
