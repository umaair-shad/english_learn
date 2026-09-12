import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get(':studentId/activities')
  list(@Param('studentId', new ParseIntPipe()) studentId: number) {
    return this.service.listForStudent(studentId);
  }
}
