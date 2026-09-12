import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SET_SORTS = ['name', 'createdAt', 'id'] as const;
export type SetSort = (typeof SET_SORTS)[number];

export const MAX_SET_ITEMS = 1000;

export class SetQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  isActive?: boolean;

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
  @IsIn(SET_SORTS)
  sort: SetSort = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}

export class CreateVocabularySetDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SET_ITEMS)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  senseIds?: number[];
}

export class UpdateVocabularySetDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetItemsDto {
  @IsArray()
  @ArrayMaxSize(MAX_SET_ITEMS)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  senseIds!: number[];
}

export const ASSIGNMENT_STATUSES = [
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_SOURCE_TYPES = ['MANUAL', 'VOCABULARY_SET'] as const;
export type AssignmentSourceType = (typeof ASSIGNMENT_SOURCE_TYPES)[number];
