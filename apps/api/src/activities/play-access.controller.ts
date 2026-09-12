import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import { CreateEventDto } from './dto/activities.dto';
import { PlayAccessService } from './play-access.service';

@ApiTags('play-access')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('play-access')
export class PlayAccessController {
  constructor(
    private readonly play: PlayAccessService,
    private readonly activities: ActivitiesService,
    private readonly sessions: ActivitySessionsService,
  ) {}

  @Get(':token')
  async resolve(@Param('token') token: string) {
    const access = await this.play.requireValid(token);
    const activity = await this.activities.summaryForStudent(
      access.studentId,
      access.activityId,
    );
    return { access, activity };
  }

  @Post(':token/start')
  @HttpCode(HttpStatus.CREATED)
  async start(@Param('token') token: string) {
    const access = await this.play.requireValid(token);
    const started = await this.sessions.start(
      access.studentId,
      access.activityId,
    );
    await this.play.consumeIfSingleUse(token);
    return started;
  }

  @Get(':token/sessions/:sessionId')
  async session(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const access = await this.play.requireValid(token);
    return this.sessions.getForStudent(access.studentId, sessionId);
  }

  @Post(':token/sessions/:sessionId/pause')
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const access = await this.play.requireValid(token);
    return this.sessions.pause(access.studentId, sessionId);
  }

  @Post(':token/sessions/:sessionId/resume')
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const access = await this.play.requireValid(token);
    return this.sessions.resume(access.studentId, sessionId);
  }

  @Post(':token/sessions/:sessionId/finish')
  @HttpCode(HttpStatus.OK)
  async finish(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const access = await this.play.requireValid(token);
    return this.sessions.finish(access.studentId, sessionId);
  }

  @Post(':token/sessions/:sessionId/events')
  @HttpCode(HttpStatus.CREATED)
  async recordEvent(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
    @Body() body: CreateEventDto,
  ) {
    const access = await this.play.requireValid(token);
    await this.sessions.recordEvent(access.studentId, sessionId, body);
    return this.sessions.getForStudent(access.studentId, sessionId);
  }
}
