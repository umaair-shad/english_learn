import { Injectable, NotFoundException } from '@nestjs/common';
import { hashAccessToken } from '../common/utils/access-token.util';
import { PrismaService } from '../database/prisma.service';

export interface StudentAccessResolution {
  student: {
    id: number;
    firstName: string;
    lastName: string | null;
    displayName: string;
  };
  token: {
    prefix: string;
    expiresAt: string | null;
  };
}

/**
 * Resolves private access tokens to a student. All public endpoints derive the
 * student id EXCLUSIVELY from the token -- arbitrary student ids are never
 * accepted on the public surface.
 */
@Injectable()
export class StudentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(rawToken: string): Promise<StudentAccessResolution> {
    const record = await this.requireValidToken(rawToken);
    return {
      student: {
        id: Number(record.students.id),
        firstName: record.students.first_name,
        lastName: record.students.last_name,
        displayName: record.students.display_name,
      },
      token: {
        prefix: record.token_prefix,
        expiresAt: record.expires_at?.toISOString() ?? null,
      },
    };
  }

  /** Returns the student id backing a token (invoked by public endpoints). */
  async studentIdFromToken(rawToken: string): Promise<number> {
    const record = await this.requireValidToken(rawToken);
    return Number(record.students.id);
  }

  private async requireValidToken(rawToken: string) {
    const record = await this.prisma.student_access_tokens.findUnique({
      where: { token_hash: hashAccessToken(rawToken) },
      include: { students: true },
    });

    const valid =
      record !== null &&
      record.is_active &&
      record.revoked_at === null &&
      (record.expires_at === null || record.expires_at > new Date()) &&
      record.students.is_active;

    if (!valid) {
      throw new NotFoundException('Invalid or expired access link');
    }

    await this.prisma.student_access_tokens.update({
      where: { id: record.id },
      data: { last_used_at: new Date() },
    });

    return record;
  }
}
