import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivitySessionsService } from './activity-sessions.service';
import { SessionEventListQueryDto } from './dto/activities.dto';

@ApiTags('activity-sessions')
@ApiBearerAuth()
@Controller('activity-sessions')
export class ActivitySessionsController {
  constructor(private readonly service: ActivitySessionsService) {}

  @Get(':id')
  getSession(@Param('id', new ParseIntPipe()) id: number) {
    return this.service.getTeacherSession(id);
  }

  @Get(':id/events')
  events(
    @Param('id', new ParseIntPipe()) id: number,
    @Query() query: SessionEventListQueryDto,
  ) {
    return this.service.events(id, query);
  }
}
