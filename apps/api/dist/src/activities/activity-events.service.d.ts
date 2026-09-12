import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ActivityEventType } from './dto/activities.dto';
export interface ActivityEventWrite {
    sessionId: number;
    activityId: number;
    studentId: number;
    vocabularySenseId: number | null;
    eventType: ActivityEventType;
    direction?: string | null;
    response?: string | null;
    isCorrect?: boolean | null;
    responseTimeMs?: number | null;
    metadata?: Record<string, unknown> | null;
    occurredAt?: Date;
}
export interface ActivityEventDto {
    id: number;
    sessionId: number;
    activityId: number;
    studentId: number;
    vocabularySenseId: number | null;
    eventType: string;
    direction: string | null;
    response: string | null;
    isCorrect: boolean | null;
    responseTimeMs: number | null;
    metadata: Record<string, unknown> | null;
    occurredAt: string;
    createdAt: string;
}
export declare const EVENT_TYPES: readonly ["ACTIVITY_STARTED", "CARD_SHOWN", "ANSWER_SUBMITTED", "ANSWER_CORRECT", "ANSWER_INCORRECT", "MATCH_FOUND", "MATCH_FAILED", "QUESTION_COMPLETED", "PAUSED", "RESUMED", "FINISHED"];
export declare class ActivityEventsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    static assertPostable(eventType: string): void;
    append(tx: Prisma.TransactionClient, input: ActivityEventWrite): Promise<ActivityEventDto>;
    private toDto;
}
