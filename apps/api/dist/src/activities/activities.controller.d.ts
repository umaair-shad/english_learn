import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import { ActivityQueryDto, CreateActivityDto, CreateActivityLinkDto, UpdateActivityDto } from './dto/activities.dto';
import { PlayAccessService } from './play-access.service';
export declare class ActivitiesController {
    private readonly service;
    private readonly sessionsService;
    private readonly play;
    constructor(service: ActivitiesService, sessionsService: ActivitySessionsService, play: PlayAccessService);
    list(query: ActivityQueryDto): Promise<{
        data: import("./activities.service").ActivityListItemDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getById(id: number): Promise<import("./activities.service").ActivityDetailDto>;
    sessions(id: number): Promise<import("./activity-sessions.service").SessionListItemDto[]>;
    create(req: AuthenticatedRequest, body: CreateActivityDto): Promise<{
        id: number;
    }>;
    update(id: number, body: UpdateActivityDto): Promise<import("./activities.service").ActivityDetailDto>;
    remove(id: number): Promise<{
        id: number;
        cancelled: boolean;
    }>;
    createPlayLink(id: number, body: CreateActivityLinkDto): Promise<import("./play-access.service").CreatedActivityAccessToken>;
    regeneratePlayLink(id: number, body: CreateActivityLinkDto): Promise<import("./play-access.service").CreatedActivityAccessToken>;
    revokePlayLink(id: number): Promise<{
        id: number;
        revoked: boolean;
    }>;
}
