import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { ImportVocabularyDto } from './imports.dto';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('vocabulary')
  @ApiOperation({
    summary: 'Import vocabulary rows (JSON or CSV) as a teacher',
  })
  async importVocabulary(
    @CurrentTeacher() teacher: { teacherId: number },
    @Body() dto: ImportVocabularyDto,
  ) {
    return this.service.importVocabulary(teacher.teacherId, dto);
  }
}
