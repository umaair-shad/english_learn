import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import {
  RecentActivityQueryDto,
  ReportStudentsQueryDto,
  ReportsQueryDto,
  ReviewTrendQueryDto,
} from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Teacher dashboard summary from real database state',
  })
  dashboard(
    @CurrentTeacher() teacher: { teacherId: number },
  ): Promise<unknown> {
    return this.service.dashboard(teacher.teacherId);
  }

  @Get('students')
  @ApiOperation({ summary: 'Per-student learning status distribution' })
  students(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: ReportStudentsQueryDto,
  ) {
    return this.service.students(teacher.teacherId, {
      search: query.search,
      limit: query.limit,
    });
  }

  @Get('activities')
  @ApiOperation({
    summary: 'Activity performance (sessions, accuracy, progress)',
  })
  activities(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: ReportsQueryDto,
  ) {
    return this.service.activities(teacher.teacherId, {
      studentId: query.studentId,
      activityType: query.activityType,
      from: query.from,
      to: query.to,
    });
  }

  @Get('review-trend')
  @ApiOperation({ summary: 'Review activity per day (correct/incorrect)' })
  reviewTrend(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: ReviewTrendQueryDto,
  ) {
    return this.service.reviewTrend(
      teacher.teacherId,
      query.studentId,
      query.days,
    );
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Recent activity events across teacher students' })
  recentActivity(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: RecentActivityQueryDto,
  ) {
    return this.service.recentActivity(teacher.teacherId, query.limit);
  }
}
