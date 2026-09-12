import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from '../assignments/assignments.service';
import { Public } from '../common/decorators/public.decorator';
import { LearningService } from '../learning/learning.service';
import {
  DueReviewsQueryDto,
  StudentVocabularyQueryDto,
} from '../learning/dto/learning.dto';
import { StudentAccessService } from './student-access.service';

@ApiTags('student-access')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('student-access')
export class StudentAccessController {
  constructor(
    private readonly access: StudentAccessService,
    private readonly learning: LearningService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Get(':token')
  resolve(@Param('token') token: string) {
    return this.access.resolve(token);
  }

  @Get(':token/vocabulary/summary')
  async summary(@Param('token') token: string) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.learning.summary(studentId);
  }

  @Get(':token/vocabulary')
  async vocabulary(
    @Param('token') token: string,
    @Query() query: StudentVocabularyQueryDto,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.learning.list(studentId, query);
  }

  @Get(':token/reviews/due')
  async due(@Param('token') token: string, @Query() query: DueReviewsQueryDto) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.learning.due(studentId, query);
  }

  @Get(':token/assignments')
  async assignments(@Param('token') token: string) {
    const studentId = await this.access.studentIdFromToken(token);
    return this.assignmentsService.listForStudent(studentId);
  }

  @Get(':token/assignments/:assignmentId')
  async assignment(
    @Param('token') token: string,
    @Param('assignmentId', new ParseIntPipe()) assignmentId: number,
  ) {
    const studentId = await this.access.studentIdFromToken(token);
    if (
      !(await this.assignmentsService.belongsToStudent(assignmentId, studentId))
    ) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }
    return this.assignmentsService.getById(assignmentId);
  }
}
