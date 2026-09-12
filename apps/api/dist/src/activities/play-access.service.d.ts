import { PrismaService } from '../database/prisma.service';
export declare const ACTIVITY_LINK_TYPES: readonly ["PERMANENT", "EXPIRING", "SINGLE_USE"];
export type ActivityLinkType = (typeof ACTIVITY_LINK_TYPES)[number];
export interface CreatedActivityAccessToken {
    activityId: number;
    rawToken: string;
    tokenPrefix: string;
    linkType: ActivityLinkType;
    url: string;
    expiresAt: string | null;
}
export interface ResolvedPlayAccess {
    activityId: number;
    studentId: number;
    linkType: ActivityLinkType;
    title: string;
    activityType: string;
    student: {
        id: number;
        displayName: string;
        firstName: string;
    };
}
export declare class PlayAccessService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createToken(activityId: number, linkType: ActivityLinkType, expiresInSeconds?: number): Promise<CreatedActivityAccessToken>;
    revoke(activityId: number): Promise<void>;
    studentIdFromToken(rawToken: string): Promise<number>;
    requireValid(rawToken: string): Promise<ResolvedPlayAccess>;
    consumeIfSingleUse(rawToken: string): Promise<void>;
    private revokeActive;
}
