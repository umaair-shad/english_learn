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
import { StudentAccessService } from '../student-access/student-access.service';
import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import { CreateEventDto } from './dto/activities.dto';

@ApiTags('student-access')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('student-access')
export class StudentActivityController {
  constructor(
    private readonly access: StudentAccessService,
    private readonly activitiesService: ActivitiesService,
    private readonly sessions: ActivitySessionsService,
  ) {}

  @Get(':token/activities')
  async activities(@Param('token') token: string) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.activitiesService.listForStudent(studentId);
  }

  @Get(':token/activities/:activityId')
  async activity(
    @Param('token') token: string,
    @Param('activityId', new ParseIntPipe()) activityId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.activitiesService.summaryForStudent(studentId, activityId);
  }

  @Post(':token/activities/:activityId/start')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Param('token') token: string,
    @Param('activityId', new ParseIntPipe()) activityId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.sessions.start(studentId, activityId);
  }

  @Get(':token/activity-sessions/:sessionId')
  async session(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.sessions.getForStudent(studentId, sessionId);
  }

  @Post(':token/activity-sessions/:sessionId/pause')
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.sessions.pause(studentId, sessionId);
  }

  @Post(':token/activity-sessions/:sessionId/resume')
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.sessions.resume(studentId, sessionId);
  }

  @Post(':token/activity-sessions/:sessionId/finish')
  @HttpCode(HttpStatus.OK)
  async finish(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.sessions.finish(studentId, sessionId);
  }

  @Post(':token/activity-sessions/:sessionId/events')
  @HttpCode(HttpStatus.CREATED)
  async recordEvent(
    @Param('token') token: string,
    @Param('sessionId', new ParseIntPipe()) sessionId: number,
    @Body() body: CreateEventDto,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    await this.sessions.recordEvent(studentId, sessionId, body);
    return this.sessions.getForStudent(studentId, sessionId);
  }
}
