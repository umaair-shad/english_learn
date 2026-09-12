import { PrismaService } from '../database/prisma.service';
export interface HealthResponse {
    status: 'ok' | 'error';
    database: 'up' | 'down';
    latencyMs: number;
    tables: number;
    timestamp: string;
}
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): Promise<HealthResponse>;
}
