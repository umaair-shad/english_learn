import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ACTIVITY_TYPES } from '../activities/dto/activities.dto';
import { CEFR_LEVELS } from '../vocabulary/dto/vocabulary-query.dto';
import type { CefrLevel } from '../vocabulary/dto/vocabulary-query.dto';

export const EXPORT_FORMATS = ['csv', 'json', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

class ExportFormatDto {
  @IsOptional()
  @IsEnum(EXPORT_FORMATS)
  format: ExportFormat = 'csv';
}

export class VocabularyExportDto extends ExportFormatDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(128)
  category?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  hasPolishTranslation?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  frequencyRank?: number;
}

export class StudentsExportDto extends ExportFormatDto {}

export class LearningExportDto extends ExportFormatDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  studentId?: number;
}

export class AssignmentsExportDto extends ExportFormatDto {}

export class SessionsExportDto extends ExportFormatDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsEnum(ACTIVITY_TYPES)
  activityType?: (typeof ACTIVITY_TYPES)[number];

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
