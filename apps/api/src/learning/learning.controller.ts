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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AssignSenseDto,
  DueReviewsQueryDto,
  OverrideStateDto,
  ReviewSenseDto,
  StudentVocabularyQueryDto,
} from './dto/learning.dto';
import { LearningService } from './learning.service';

@ApiTags('learning')
@ApiBearerAuth()
@Controller('students/:studentId')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('vocabulary')
  listVocabulary(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Query() query: StudentVocabularyQueryDto,
  ) {
    return this.learning.list(studentId, query);
  }

  @Get('reviews/due')
  due(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Query() query: DueReviewsQueryDto,
  ) {
    return this.learning.due(studentId, query);
  }

  @Get('vocabulary/summary')
  summary(@Param('studentId', new ParseIntPipe()) studentId: number) {
    return this.learning.summary(studentId);
  }

  @Get('vocabulary/distribution')
  distribution(@Param('studentId', new ParseIntPipe()) studentId: number) {
    return this.learning.distribution(studentId);
  }

  @Get('vocabulary/:senseId')
  senseDetail(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
  ) {
    return this.learning.detail(studentId, senseId);
  }

  @Post('vocabulary/:senseId/assign')
  @HttpCode(HttpStatus.OK)
  assign(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
    @Body() body: AssignSenseDto,
  ) {
    return this.learning.assign(
      studentId,
      senseId,
      body.sourceType ?? 'manual',
    );
  }

  @Post('vocabulary/:senseId/review')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async review(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
    @Body() body: ReviewSenseDto,
  ) {
    await this.learning.review(studentId, senseId, body);
    return this.learning.detail(studentId, senseId);
  }

  @Delete('vocabulary/:senseId')
  @HttpCode(HttpStatus.OK)
  unassign(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
  ) {
    return this.learning.unassign(studentId, senseId);
  }

  @Patch('vocabulary/:senseId/state')
  override(
    @Param('studentId', new ParseIntPipe()) studentId: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
    @Body() body: OverrideStateDto,
  ) {
    return this.learning.override(studentId, senseId, body);
  }
}
