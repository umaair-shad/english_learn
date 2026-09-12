"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayAccessService = exports.ACTIVITY_LINK_TYPES = void 0;
const common_1 = require("@nestjs/common");
const access_token_util_1 = require("../common/utils/access-token.util");
const prisma_service_1 = require("../database/prisma.service");
exports.ACTIVITY_LINK_TYPES = [
    'PERMANENT',
    'EXPIRING',
    'SINGLE_USE',
];
let PlayAccessService = class PlayAccessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createToken(activityId, linkType, expiresInSeconds) {
        const activity = await this.prisma.activities.findUnique({
            where: { id: BigInt(activityId) },
            select: { id: true, status: true },
        });
        if (!activity)
            throw new common_1.NotFoundException('Activity not found');
        if (activity.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot issue a link for a cancelled activity');
        }
        if (linkType === 'EXPIRING' && !expiresInSeconds) {
            throw new common_1.BadRequestException('Expiring links require expiresInSeconds');
        }
        await this.revokeActive(activityId);
        const { rawToken, tokenHash, tokenPrefix } = (0, access_token_util_1.generateAccessTokenPair)();
        const expiresAt = linkType === 'EXPIRING' && expiresInSeconds
            ? new Date(Date.now() + expiresInSeconds * 1000)
            : null;
        await this.prisma.activity_access_tokens.create({
            data: {
                activity_id: BigInt(activityId),
                token_hash: tokenHash,
                token_prefix: tokenPrefix,
                link_type: linkType,
                expires_at: expiresAt,
            },
        });
        return {
            activityId,
            rawToken,
            tokenPrefix,
            linkType,
            url: `/play/${rawToken}`,
            expiresAt: expiresAt?.toISOString() ?? null,
        };
    }
    async revoke(activityId) {
        const activity = await this.prisma.activities.findUnique({
            where: { id: BigInt(activityId) },
            select: { id: true },
        });
        if (!activity)
            throw new common_1.NotFoundException('Activity not found');
        await this.revokeActive(activityId);
    }
    async studentIdFromToken(rawToken) {
        const resolved = await this.requireValid(rawToken);
        return resolved.studentId;
    }
    async requireValid(rawToken) {
        if (!rawToken || rawToken.length < 16) {
            throw new common_1.UnauthorizedException('Invalid activity link');
        }
        const record = await this.prisma.activity_access_tokens.findUnique({
            where: { token_hash: (0, access_token_util_1.hashAccessToken)(rawToken) },
            include: {
                activities: {
                    select: {
                        id: true,
                        student_id: true,
                        title: true,
                        activity_type: true,
                        status: true,
                        students: {
                            select: {
                                id: true,
                                display_name: true,
                                first_name: true,
                                is_active: true,
                            },
                        },
                    },
                },
            },
        });
        if (!record || !record.is_active || record.revoked_at) {
            throw new common_1.UnauthorizedException('Invalid activity link');
        }
        if (record.expires_at && record.expires_at.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('This activity link has expired');
        }
        if (record.link_type === 'SINGLE_USE' && record.consumed_at) {
            throw new common_1.UnauthorizedException('This activity link has already been used');
        }
        const activity = record.activities;
        if (activity.status === 'CANCELLED' || !activity.students.is_active) {
            throw new common_1.UnauthorizedException('This activity is no longer available');
        }
        await this.prisma.activity_access_tokens.update({
            where: { id: record.id },
            data: { last_used_at: new Date() },
        });
        return {
            activityId: Number(activity.id),
            studentId: Number(activity.student_id),
            linkType: record.link_type,
            title: activity.title,
            activityType: activity.activity_type,
            student: {
                id: Number(activity.students.id),
                displayName: activity.students.display_name,
                firstName: activity.students.first_name,
            },
        };
    }
    async consumeIfSingleUse(rawToken) {
        const hash = (0, access_token_util_1.hashAccessToken)(rawToken);
        await this.prisma.activity_access_tokens.updateMany({
            where: {
                token_hash: hash,
                link_type: 'SINGLE_USE',
                consumed_at: null,
            },
            data: { consumed_at: new Date() },
        });
    }
    async revokeActive(activityId) {
        await this.prisma.activity_access_tokens.updateMany({
            where: {
                activity_id: BigInt(activityId),
                is_active: true,
                revoked_at: null,
            },
            data: { is_active: false, revoked_at: new Date() },
        });
    }
};
exports.PlayAccessService = PlayAccessService;
exports.PlayAccessService = PlayAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlayAccessService);
//# sourceMappingURL=play-access.service.js.map