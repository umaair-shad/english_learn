import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import {
  AssignmentsExportDto,
  LearningExportDto,
  SessionsExportDto,
  StudentsExportDto,
  VocabularyExportDto,
} from './exports.dto';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('vocabulary')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Export vocabulary catalog rows (CSV/JSON/XLSX)' })
  async exportVocabulary(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: VocabularyExportDto,
  ) {
    const file = await this.service.exportVocabulary(teacher.teacherId, query);
    return this.toStream(file, 'vocabulary');
  }

  @Get('students')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Export teacher-owned students with learning status',
  })
  async exportStudents(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: StudentsExportDto,
  ) {
    const file = await this.service.exportStudents(
      teacher.teacherId,
      query.format,
    );
    return this.toStream(file, 'students');
  }

  @Get('learning')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Export student vocabulary learning states' })
  async exportLearning(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: LearningExportDto,
  ) {
    const file = await this.service.exportLearning(teacher.teacherId, query);
    return this.toStream(file, 'learning');
  }

  @Get('assignments')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Export teacher assignments with progress' })
  async exportAssignments(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: AssignmentsExportDto,
  ) {
    const file = await this.service.exportAssignments(
      teacher.teacherId,
      query.format,
    );
    return this.toStream(file, 'assignments');
  }

  @Get('sessions')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Export activity sessions with results' })
  async exportSessions(
    @CurrentTeacher() teacher: { teacherId: number },
    @Query() query: SessionsExportDto,
  ) {
    const file = await this.service.exportSessions(teacher.teacherId, query);
    return this.toStream(file, 'sessions');
  }

  private toStream(
    file: { buffer: Buffer; contentType: string; extension: string },
    base: string,
  ): StreamableFile {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${base}-${date}.${file.extension}`;
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${filename}"`,
      length: file.buffer.byteLength,
    });
  }
}
