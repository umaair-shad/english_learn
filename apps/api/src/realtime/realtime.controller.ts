import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { RealtimeService } from './realtime.service';

export class LiveQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  online?: boolean;
}

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  /** HTTP initial snapshot for the teacher live-monitoring page. */
  @Get('live')
  live(@Query() query: LiveQueryDto, @Req() req: AuthenticatedRequest) {
    const teacher = req.teacher;
    if (!teacher) return [];
    return this.realtime.liveSnapshot(teacher.teacherId, query.online);
  }

  /** Short-lived JWT for the teacher WebSocket handshake. The login cookie is
   *  httpOnly, so the browser cannot read it back for socket auth. */
  @Get('credentials')
  @HttpCode(HttpStatus.OK)
  async credentials(@Req() req: AuthenticatedRequest) {
    const teacher = req.teacher;
    if (!teacher) {
      throw new UnauthorizedException('Not authenticated');
    }
    const accessToken = await this.jwtService.signAsync(
      { sub: teacher.teacherId.toString(), email: teacher.email },
      { expiresIn: '15m' },
    );
    return { accessToken } as const;
  }
}
