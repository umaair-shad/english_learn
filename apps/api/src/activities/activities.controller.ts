import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { ActivitiesService } from './activities.service';
import { ActivitySessionsService } from './activity-sessions.service';
import {
  ActivityQueryDto,
  CreateActivityDto,
  CreateActivityLinkDto,
  UpdateActivityDto,
} from './dto/activities.dto';
import { PlayAccessService } from './play-access.service';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly service: ActivitiesService,
    private readonly sessionsService: ActivitySessionsService,
    private readonly play: PlayAccessService,
  ) {}

  @Get()
  list(@Query() query: ActivityQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', new ParseIntPipe()) id: number) {
    return this.service.getById(id);
  }

  @Get(':id/sessions')
  sessions(@Param('id', new ParseIntPipe()) id: number) {
    return this.sessionsService.listSessions(id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateActivityDto) {
    return this.service.create(req.teacher!.teacherId, body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: UpdateActivityDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseIntPipe()) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/access-token')
  createPlayLink(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: CreateActivityLinkDto,
  ) {
    return this.play.createToken(id, body.linkType ?? 'PERMANENT', body.expiresInSeconds);
  }

  @Post(':id/access-token/regenerate')
  @HttpCode(HttpStatus.CREATED)
  regeneratePlayLink(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: CreateActivityLinkDto,
  ) {
    return this.play.createToken(id, body.linkType ?? 'PERMANENT', body.expiresInSeconds);
  }

  @Post(':id/access-token/revoke')
  @HttpCode(HttpStatus.OK)
  async revokePlayLink(@Param('id', new ParseIntPipe()) id: number) {
    await this.play.revoke(id);
    return { id, revoked: true };
  }
}
