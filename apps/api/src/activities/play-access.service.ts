import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  generateAccessTokenPair,
  hashAccessToken,
} from '../common/utils/access-token.util';
import { PrismaService } from '../database/prisma.service';

export const ACTIVITY_LINK_TYPES = [
  'PERMANENT',
  'EXPIRING',
  'SINGLE_USE',
] as const;
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
  student: { id: number; displayName: string; firstName: string };
}

@Injectable()
export class PlayAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(
    activityId: number,
    linkType: ActivityLinkType,
    expiresInSeconds?: number,
  ): Promise<CreatedActivityAccessToken> {
    const activity = await this.prisma.activities.findUnique({
      where: { id: BigInt(activityId) },
      select: { id: true, status: true },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (activity.status === 'CANCELLED') {
      throw new BadRequestException('Cannot issue a link for a cancelled activity');
    }
    if (linkType === 'EXPIRING' && !expiresInSeconds) {
      throw new BadRequestException('Expiring links require expiresInSeconds');
    }

    await this.revokeActive(activityId);

    const { rawToken, tokenHash, tokenPrefix } = generateAccessTokenPair();
    const expiresAt =
      linkType === 'EXPIRING' && expiresInSeconds
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

  async revoke(activityId: number): Promise<void> {
    const activity = await this.prisma.activities.findUnique({
      where: { id: BigInt(activityId) },
      select: { id: true },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.revokeActive(activityId);
  }

  async studentIdFromToken(rawToken: string): Promise<number> {
    const resolved = await this.requireValid(rawToken);
    return resolved.studentId;
  }

  async requireValid(rawToken: string): Promise<ResolvedPlayAccess> {
    if (!rawToken || rawToken.length < 16) {
      throw new UnauthorizedException('Invalid activity link');
    }
    const record = await this.prisma.activity_access_tokens.findUnique({
      where: { token_hash: hashAccessToken(rawToken) },
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
      throw new UnauthorizedException('Invalid activity link');
    }
    if (record.expires_at && record.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('This activity link has expired');
    }
    if (record.link_type === 'SINGLE_USE' && record.consumed_at) {
      throw new UnauthorizedException('This activity link has already been used');
    }
    const activity = record.activities;
    if (activity.status === 'CANCELLED' || !activity.students.is_active) {
      throw new UnauthorizedException('This activity is no longer available');
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

  async consumeIfSingleUse(rawToken: string): Promise<void> {
    const hash = hashAccessToken(rawToken);
    await this.prisma.activity_access_tokens.updateMany({
      where: {
        token_hash: hash,
        link_type: 'SINGLE_USE',
        consumed_at: null,
      },
      data: { consumed_at: new Date() },
    });
  }

  private async revokeActive(activityId: number): Promise<void> {
    await this.prisma.activity_access_tokens.updateMany({
      where: {
        activity_id: BigInt(activityId),
        is_active: true,
        revoked_at: null,
      },
      data: { is_active: false, revoked_at: new Date() } as Prisma.activity_access_tokensUpdateManyMutationInput,
    });
  }
}
