import { ActivitySessionsService } from './activity-sessions.service';
import { SessionEventListQueryDto } from './dto/activities.dto';
export declare class ActivitySessionsController {
    private readonly service;
    constructor(service: ActivitySessionsService);
    getSession(id: number): Promise<import("./activity-sessions.service").ActivitySessionDto>;
    events(id: number, query: SessionEventListQueryDto): Promise<{
        data: import("./activity-sessions.service").SessionEventListItemDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
}
