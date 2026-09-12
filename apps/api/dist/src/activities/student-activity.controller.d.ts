import { StudentAccessService } from '../student-access/student-access.service';
import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import { CreateEventDto } from './dto/activities.dto';
export declare class StudentActivityController {
    private readonly access;
    private readonly activitiesService;
    private readonly sessions;
    constructor(access: StudentAccessService, activitiesService: ActivitiesService, sessions: ActivitySessionsService);
    activities(token: string): Promise<import("./activities.service").ActivityListItemDto[]>;
    activity(token: string, activityId: number): Promise<import("./activities.service").ActivityDetailDto>;
    start(token: string, activityId: number): Promise<{
        session: import("./activity-sessions.service").ActivitySessionDto;
        items: import("./activity-items.helper").ActivityItemShape[];
    }>;
    session(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    pause(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    resume(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    finish(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    recordEvent(token: string, sessionId: number, body: CreateEventDto): Promise<import("./activity-sessions.service").ActivitySessionDto>;
}
