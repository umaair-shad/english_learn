import { PrismaService } from '../database/prisma.service';
export interface TeacherProfile {
    id: number;
    email: string;
    displayName: string;
}
export declare class TeachersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: bigint;
        email: string;
        password_hash: string;
        display_name: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
    } | null>;
    getProfile(id: number): Promise<TeacherProfile>;
    touchLastLogin(id: number): Promise<void>;
    upsertCredentials(email: string, passwordHash: string, displayName: string): Promise<{
        id: bigint;
        email: string;
        password_hash: string;
        display_name: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
    }>;
    toProfile(teacher: {
        id: bigint;
        email: string;
        display_name: string;
    }): TeacherProfile;
}
