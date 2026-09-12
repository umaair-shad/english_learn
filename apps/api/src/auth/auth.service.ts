import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import {
  TeachersService,
  type TeacherProfile,
} from '../teachers/teachers.service';

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  teacher: TeacherProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly teachers: TeachersService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase();
    const teacher = await this.prisma.teacher_accounts.findUnique({
      where: { email: normalizedEmail },
    });

    const valid =
      teacher !== null &&
      teacher.is_active &&
      (await compare(password, teacher.password_hash));

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: teacher.id.toString(), email: teacher.email };
    const rawExpiresIn = this.config.get<string>('ACCESS_TOKEN_TTL') ?? '15m';
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: rawExpiresIn as JwtSignOptions['expiresIn'],
    });

    await this.teachers.touchLastLogin(Number(teacher.id));

    return {
      accessToken,
      expiresIn: rawExpiresIn,
      teacher: this.teachers.toProfile(teacher),
    };
  }

  async changePassword(
    teacherId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher_accounts.findUnique({
      where: { id: BigInt(teacherId) },
    });
    if (!teacher || !teacher.is_active) {
      throw new UnauthorizedException('Not authenticated');
    }
    const valid = await compare(currentPassword, teacher.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hash(newPassword, 10);
    await this.prisma.teacher_accounts.update({
      where: { id: teacher.id },
      data: { password_hash: passwordHash, updated_at: new Date() },
    });
  }
}
