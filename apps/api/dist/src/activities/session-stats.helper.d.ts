import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
export interface SessionAnswerStats {
    completed: number;
    correct: number;
    incorrect: number;
    answeredSenseIds: number[];
}
export declare function loadSessionAnswerStats(db: PrismaService | Prisma.TransactionClient, sessionIds: bigint[]): Promise<Map<bigint, SessionAnswerStats>>;
export declare function statsFor(map: Map<bigint, SessionAnswerStats>, sessionId: bigint): SessionAnswerStats;
export declare function percentComplete(completed: number, totalItems: number): number;
