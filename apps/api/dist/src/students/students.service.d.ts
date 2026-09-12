import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenOptionsDto, CreateStudentDto, StudentQueryDto, UpdateStudentDto } from './dto/students.dto';
export interface StudentDto {
    id: number;
    firstName: string;
    lastName: string | null;
    displayName: string;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface PaginatedStudents {
    data: StudentDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface StudentAccessTokenDto {
    id: number;
    prefix: string;
    isActive: boolean;
    expiresAt: string | null;
    lastUsedAt: string | null;
}
export interface CreatedAccessToken {
    studentId: number;
    rawToken: string;
    tokenPrefix: string;
    url: string;
    expiresAt: string | null;
}
type StudentRow = Prisma.studentsGetPayload<Record<string, never>>;
export declare class StudentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: StudentQueryDto): Promise<PaginatedStudents>;
    getById(id: number): Promise<StudentDto & {
        accessToken: StudentAccessTokenDto | null;
    }>;
    create(dto: CreateStudentDto): Promise<StudentDto>;
    update(id: number, dto: UpdateStudentDto): Promise<StudentDto & {
        accessToken: StudentAccessTokenDto | null;
    }>;
    softDelete(id: number): Promise<void>;
    createAccessToken(studentId: number, options?: AccessTokenOptionsDto): Promise<CreatedAccessToken>;
    revokeAccessToken(studentId: number): Promise<void>;
    private revokeActiveTokens;
    toStudentDto(row: StudentRow): StudentDto;
}
export {};
