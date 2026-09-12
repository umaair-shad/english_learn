import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const VOCABULARY_SORTS = [
  'lemma',
  'position',
  'frequency',
  'id',
] as const;
export type VocabularySort = (typeof VOCABULARY_SORTS)[number];

export class ListVocabularyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string;

  @IsOptional()
  @IsIn(CEFR_LEVELS)
  cefr?: CefrLevel;

  /** Match sense categories (code or name, case-insensitive, partial). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  hasPolishTranslation?: boolean;

  /** Keep only senses whose entry has a NGSL frequency rank better (lower) than this. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30000)
  frequencyRank?: number;

  @IsOptional()
  @IsIn(VOCABULARY_SORTS)
  sort: VocabularySort = 'lemma';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}

export class SearchVocabularyDto {
  @IsString()
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 20;
}
