import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface TeacherProfile {
  id: number;
  email: string;
  displayName: string;
}

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.teacher_accounts.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async getProfile(id: number): Promise<TeacherProfile> {
    const teacher = await this.prisma.teacher_accounts.findUnique({
      where: { id: BigInt(id) },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.toProfile(teacher);
  }

  async touchLastLogin(id: number): Promise<void> {
    await this.prisma.teacher_accounts.update({
      where: { id: BigInt(id) },
      data: { last_login_at: new Date() },
    });
  }

  async upsertCredentials(
    email: string,
    passwordHash: string,
    displayName: string,
  ) {
    const normalized = email.toLowerCase();
    const existing = await this.prisma.teacher_accounts.findUnique({
      where: { email: normalized },
    });
    if (existing) {
      return this.prisma.teacher_accounts.update({
        where: { id: existing.id },
        data: { password_hash: passwordHash, display_name: displayName },
      });
    }
    return this.prisma.teacher_accounts.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        display_name: displayName,
      },
    });
  }

  toProfile(teacher: {
    id: bigint;
    email: string;
    display_name: string;
  }): TeacherProfile {
    return {
      id: Number(teacher.id),
      email: teacher.email,
      displayName: teacher.display_name,
    };
  }
}
