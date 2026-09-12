import { PrismaService } from '../database/prisma.service';
import { ActivityEventsService } from './activity-events.service';
import { ActivityLearningService } from './activity-learning.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateEventDto, SessionEventListQueryDto } from './dto/activities.dto';
import type { ActivityItemShape } from './activity-items.helper';
export interface ActivitySessionDto {
    id: number;
    activityId: number;
    studentId: number;
    status: string;
    startedAt: string;
    lastActivityAt: string;
    finishedAt: string | null;
    pausedAt: string | null;
    currentItemIndex: number | null;
    totalItems: number;
    correctCount: number;
    incorrectCount: number;
    completedCount: number;
    percentComplete: number;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    activity: {
        id: number;
        title: string;
        activityType: string;
        status: string;
    } | null;
}
export interface SessionListItemDto {
    id: number;
    status: string;
    startedAt: string;
    lastActivityAt: string;
    finishedAt: string | null;
    pausedAt: string | null;
    currentItemIndex: number | null;
    totalItems: number;
    correctCount: number;
    incorrectCount: number;
    completedCount: number;
    percentComplete: number;
}
export interface SessionEventListItemDto {
    id: number;
    eventType: string;
    direction: string | null;
    response: string | null;
    isCorrect: boolean | null;
    responseTimeMs: number | null;
    metadata: Record<string, unknown> | null;
    occurredAt: string;
    sense: {
        senseId: number;
        lemma: string;
        partOfSpeech: string;
    } | null;
}
export declare class ActivitySessionsService {
    private readonly prisma;
    private readonly eventsService;
    private readonly learning;
    private readonly realtime;
    constructor(prisma: PrismaService, eventsService: ActivityEventsService, learning: ActivityLearningService, realtime: RealtimeGateway);
    start(studentId: number, activityId: number): Promise<{
        session: ActivitySessionDto;
        items: ActivityItemShape[];
    }>;
    getForStudent(studentId: number, sessionId: number): Promise<ActivitySessionDto>;
    pause(studentId: number, sessionId: number): Promise<ActivitySessionDto>;
    resume(studentId: number, sessionId: number): Promise<ActivitySessionDto>;
    finish(studentId: number, sessionId: number): Promise<ActivitySessionDto>;
    recordEvent(studentId: number, sessionId: number, dto: CreateEventDto): Promise<ActivitySessionDto>;
    listSessions(activityId: number): Promise<SessionListItemDto[]>;
    getTeacherSession(sessionId: number): Promise<ActivitySessionDto>;
    events(sessionId: number, query: SessionEventListQueryDto): Promise<{
        data: SessionEventListItemDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    private emitMirror;
    private requireOwned;
    private mapSessionList;
    private loadCompletedCounts;
    private toActiveSessionDto;
}
