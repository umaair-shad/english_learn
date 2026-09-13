import { PrismaService } from '../database/prisma.service';
import type { LiveStudentDto, PresencePayload, PresenceRecord } from './realtime.types';
export declare class RealtimeService {
    private readonly prisma;
    private readonly presence;
    constructor(prisma: PrismaService);
    setPresence(studentId: number, sessionId: number | null, socketId: string): PresencePayload;
    touchPresence(studentId: number, socketId: string): PresenceRecord | null;
    clearPresence(studentId: number, socketId: string): PresencePayload | null;
    getPresence(studentId: number): PresencePayload | null;
    teacherOwnsStudent(teacherId: number, studentId: number): Promise<boolean>;
    liveSnapshot(teacherId: number, onlyOnline?: boolean): Promise<LiveStudentDto[]>;
    private activeSession;
    private toPayload;
}
