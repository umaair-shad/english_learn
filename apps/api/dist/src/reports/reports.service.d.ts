import { PrismaService } from '../database/prisma.service';
export interface StudentOverviewRow {
    studentId: number;
    displayName: string;
    isActive: boolean;
    createdAt: string;
    assigned: number;
    encountered: number;
    learning: number;
    reviewing: number;
    mastered: number;
    due: number;
    totalAssignedSenses: number;
    reviewsDone: number;
    lastActivityAt: string | null;
    sessionCount: number;
}
export interface ActivityReportRow {
    activityId: number;
    activityTitle: string;
    activityType: string;
    status: string;
    studentId: number;
    studentDisplayName: string;
    sessionCount: number;
    finishedCount: number;
    totalCorrect: number;
    totalIncorrect: number;
    avgPercentComplete: number;
    lastSessionAt: string | null;
}
export interface ReviewTrendPoint {
    date: string;
    reviews: number;
    correct: number;
    incorrect: number;
    ambiguous: number;
}
export interface RecentActivityRow {
    id: number;
    eventType: string;
    occurredAt: string;
    studentId: number;
    studentDisplayName: string;
    activityTitle: string;
    activityType: string | null;
    lemma: string | null;
    response: string | null;
    isCorrect: boolean | null;
}
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ownedStudentSql;
    dashboard(teacherId: number): Promise<{
        students: {
            total: number;
            active: number;
        };
        assignments: {
            total: number;
            active: number;
            overdue: number;
        };
        activities: {
            total: number;
            active: number;
        };
        vocabulary: {
            catalogSenses: number;
        };
        learning: {
            assigned: number;
            encountered: number;
            learning: number;
            reviewing: number;
            mastered: number;
            dueNow: number;
            totalAssignedSenses: number;
            reviewsDone: number;
        };
        recentSessions: {
            sessionId: number;
            studentId: number;
            studentDisplayName: string;
            activityId: number;
            activityTitle: string;
            activityType: string;
            status: string;
            startedAt: string;
            finishedAt: string | null;
            correct: number;
            incorrect: number;
            progress: number;
        }[];
        reviewTrend: ReviewTrendPoint[];
    }>;
    students(teacherId: number, query: {
        search?: string;
        limit?: number;
    }): Promise<StudentOverviewRow[]>;
    activities(teacherId: number, query: {
        studentId?: number;
        activityType?: string;
        from?: string;
        to?: string;
    }): Promise<ActivityReportRow[]>;
    reviewTrend(teacherId: number, studentId?: number, days?: number): Promise<ReviewTrendPoint[]>;
    recentActivity(teacherId: number, limit?: number): Promise<RecentActivityRow[]>;
    ownedStudentIds(teacherId: number): Promise<number[]>;
}
