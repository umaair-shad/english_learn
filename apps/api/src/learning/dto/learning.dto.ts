import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LEARNING_STATUSES = [
  'ASSIGNED',
  'ENCOUNTERED',
  'LEARNING',
  'REVIEWING',
  'MASTERED',
] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export const REVIEW_RATINGS = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const SOURCE_TYPES = ['manual', 'activity'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class StudentVocabularyQueryDto {
  @IsOptional()
  @IsIn(LEARNING_STATUSES)
  status?: LearningStatus;

  @IsOptional()
  @IsIn(CEFR_LEVELS)
  cefr?: (typeof CEFR_LEVELS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  due?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

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

export class AssignSenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceType?: string;
}

export class ReviewSenseDto {
  @IsIn(REVIEW_RATINGS)
  rating!: ReviewRating;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  responseTimeMs?: number;

  @IsOptional()
  @IsIn(SOURCE_TYPES)
  sourceType: SourceType = 'manual';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceId?: number;
}

export class OverrideStateDto {
  @IsIn(LEARNING_STATUSES)
  status!: LearningStatus;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  forceDue?: boolean;
}

export class DueReviewsQueryDto {
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
  limit = 50;
}
