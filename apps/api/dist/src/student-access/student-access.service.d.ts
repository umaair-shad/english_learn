import { PrismaService } from '../database/prisma.service';
export interface StudentAccessResolution {
    student: {
        id: number;
        firstName: string;
        lastName: string | null;
        displayName: string;
    };
    token: {
        prefix: string;
        expiresAt: string | null;
    };
}
export declare class StudentAccessService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolve(rawToken: string): Promise<StudentAccessResolution>;
    studentIdFromToken(rawToken: string): Promise<number>;
    private requireValidToken;
}
