import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import { CreateEventDto } from './dto/activities.dto';
import { PlayAccessService } from './play-access.service';
export declare class PlayAccessController {
    private readonly play;
    private readonly activities;
    private readonly sessions;
    constructor(play: PlayAccessService, activities: ActivitiesService, sessions: ActivitySessionsService);
    resolve(token: string): Promise<{
        access: import("./play-access.service").ResolvedPlayAccess;
        activity: import("./activities.service").ActivityDetailDto;
    }>;
    start(token: string): Promise<{
        session: import("./activity-sessions.service").ActivitySessionDto;
        items: import("./activity-items.helper").ActivityItemShape[];
    }>;
    session(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    pause(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    resume(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    finish(token: string, sessionId: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    recordEvent(token: string, sessionId: number, body: CreateEventDto): Promise<import("./activity-sessions.service").ActivitySessionDto>;
}
