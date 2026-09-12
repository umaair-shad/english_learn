import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const IMPORT_FORMATS = ['json', 'csv', 'xlsx'] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

export class ImportVocabularyRow {
  @IsString()
  @MaxLength(120)
  lemma!: string;

  @IsString()
  @MaxLength(64)
  partOfSpeech!: string;

  @IsString()
  @MaxLength(2000)
  definition!: string;

  @IsOptional()
  translations?: string[] | string;

  @IsOptional()
  examples?: string[] | string;

  @IsOptional()
  cefrLevels?: string[] | string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  senseIdHint?: string;
}

export class ImportVocabularyDto {
  @IsIn(IMPORT_FORMATS)
  format!: ImportFormat;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportVocabularyRow)
  rows?: ImportVocabularyRow[];

  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface ImportResultRow {
  row: number;
  senseId: number;
  created: boolean;
}

export interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validated: number;
  created: number;
  skippedExisting: number;
  errors: ParseError[];
  rows: ImportResultRow[];
}
