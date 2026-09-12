import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AUTH_COOKIE } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedTeacher } from '../common/types/authenticated-request';
import { TeachersService } from '../teachers/teachers.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly teachers: TeachersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie(AUTH_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        process.env.COOKIE_SECURE === 'true' ||
        process.env.COOKIE_SECURE === '1',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      teacher: result.teacher,
    } as const;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    return { ok: true as const };
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentTeacher() teacher: AuthenticatedTeacher | undefined,
    @Body() body: ChangePasswordDto,
  ) {
    if (!teacher) throw new UnauthorizedException('Not authenticated');
    await this.authService.changePassword(
      teacher.teacherId,
      body.currentPassword,
      body.newPassword,
    );
    return { ok: true as const };
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentTeacher() teacher: AuthenticatedTeacher | undefined) {
    if (!teacher) throw new UnauthorizedException('Not authenticated');
    return { teacher: await this.teachers.getProfile(teacher.teacherId) };
  }
}
