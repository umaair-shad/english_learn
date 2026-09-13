import { PrismaService } from '../database/prisma.service';
import { type ActivityItemShape } from './activity-items.helper';
import { ActivityQueryDto, CreateActivityDto, UpdateActivityDto } from './dto/activities.dto';
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
    student: {
        id: number;
        displayName: string;
        firstName: string;
    };
    assignment: {
        id: number;
        title: string;
        status: string;
    } | null;
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
    assignment: {
        id: number;
        title: string;
        status: string;
    } | null;
    itemCount: number;
    sessionCount: number;
    items: ActivityItemShape[];
}
export declare class ActivitiesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ActivityQueryDto): Promise<{
        data: ActivityListItemDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    listForStudent(studentId: number): Promise<ActivityListItemDto[]>;
    getById(id: number): Promise<ActivityDetailDto>;
    summaryForStudent(studentId: number, activityId: number): Promise<ActivityDetailDto>;
    create(teacherId: number, dto: CreateActivityDto): Promise<{
        id: number;
    }>;
    update(id: number, dto: UpdateActivityDto): Promise<ActivityDetailDto>;
    remove(id: number): Promise<{
        id: number;
        cancelled: boolean;
    }>;
    private resolveSenses;
    private resolveFromSet;
    private resolveFromStudentPool;
    private loadLatestSessions;
    private toLatestSessionDto;
}
