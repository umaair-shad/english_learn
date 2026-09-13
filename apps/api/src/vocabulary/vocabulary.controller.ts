import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CEFR_LEVELS,
  ListVocabularyDto,
  SearchVocabularyDto,
  VOCABULARY_SORTS,
} from './dto/vocabulary-query.dto';
import {
  PaginatedList,
  VocabularyDetailEntry,
} from './dto/vocabulary-response.dto';
import { VocabularyService } from './vocabulary.service';

@ApiTags('vocabulary')
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly service: VocabularyService) {}

  @Get()
  @ApiOperation({ summary: 'Search and paginate vocabulary senses' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'lexicalOnly',
    required: false,
    type: Boolean,
    description: 'Hide numeric, symbol, and leetspeak lemmas',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Matches lemma, Polish translation or definition',
  })
  @ApiQuery({ name: 'partOfSpeech', required: false, example: 'noun' })
  @ApiQuery({ name: 'cefr', required: false, enum: CEFR_LEVELS })
  @ApiQuery({
    name: 'category',
    required: false,
    description:
      'Match sense category code or name (partial, case-insensitive)',
  })
  @ApiQuery({ name: 'hasPolishTranslation', required: false, type: Boolean })
  @ApiQuery({
    name: 'frequencyRank',
    required: false,
    description: 'top-N rank filter',
  })
  @ApiQuery({ name: 'sort', required: false, enum: VOCABULARY_SORTS })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  async list(@Query() query: ListVocabularyDto): Promise<PaginatedList> {
    return this.service.list(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List vocabulary taxonomy categories' })
  listCategories() {
    return this.service.listCategories();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search across lemma, Polish translation and definition',
  })
  @ApiQuery({ name: 'q', required: true, example: 'bank' })
  async search(@Query() query: SearchVocabularyDto): Promise<PaginatedList> {
    return this.service.search(query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Sense IDs matching the current vocabulary filters' })
  listIds(@Query() query: ListVocabularyDto) {
    return this.service.listIds(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Full entry detail: senses, Polish, examples, CEFR, freq, WordNet, categories',
  })
  async detail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VocabularyDetailEntry> {
    return this.service.detail(id);
  }
}
