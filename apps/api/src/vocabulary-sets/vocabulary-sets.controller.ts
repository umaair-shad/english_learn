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
import {
  CreateVocabularySetDto,
  SetItemsDto,
  SetQueryDto,
  UpdateVocabularySetDto,
} from './dto/vocabulary-sets.dto';
import { VocabularySetsService } from './vocabulary-sets.service';

@ApiTags('vocabulary-sets')
@ApiBearerAuth()
@Controller('vocabulary-sets')
export class VocabularySetsController {
  constructor(private readonly service: VocabularySetsService) {}

  @Get()
  list(@Query() query: SetQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateVocabularySetDto,
  ) {
    return this.service.create(req.teacher!.teacherId, body);
  }

  @Get(':id')
  getById(@Param('id', new ParseIntPipe()) id: number) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: UpdateVocabularySetDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseIntPipe()) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/items')
  addItems(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: SetItemsDto,
  ) {
    return this.service.addItems(id, body);
  }

  @Delete(':id/items/:senseId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Param('id', new ParseIntPipe()) id: number,
    @Param('senseId', new ParseIntPipe()) senseId: number,
  ) {
    return this.service.removeItem(id, senseId);
  }
}
