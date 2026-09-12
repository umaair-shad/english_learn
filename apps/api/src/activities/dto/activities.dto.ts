import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ACTIVITY_TYPES = [
  'FLASHCARDS',
  'MEMORY',
  'QUIZ',
  'FILL_BLANK',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const SESSION_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'FINISHED',
  'ABANDONED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ACTIVITY_EVENT_TYPES = [
  'ACTIVITY_STARTED',
  'CARD_SHOWN',
  'ANSWER_SUBMITTED',
  'ANSWER_CORRECT',
  'ANSWER_INCORRECT',
  'MATCH_FOUND',
  'MATCH_FAILED',
  'QUESTION_COMPLETED',
  'PAUSED',
  'RESUMED',
  'FINISHED',
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/**
 * Event types a future activity may submit through the generic events
 * endpoint. Lifecycle events (ACTIVITY_STARTED/PAUSED/RESUMED/FINISHED) are
 * written exclusively by the dedicated session endpoints so no activity can
 * forge session state.
 */
export const POSTABLE_EVENT_TYPES = [
  'CARD_SHOWN',
  'ANSWER_SUBMITTED',
  'ANSWER_CORRECT',
  'ANSWER_INCORRECT',
  'MATCH_FOUND',
  'MATCH_FAILED',
  'QUESTION_COMPLETED',
] as const;
export type PostableEventType = (typeof POSTABLE_EVENT_TYPES)[number];

const SENSE_BOUND_EVENT_TYPES = new Set<string>([
  'CARD_SHOWN',
  'ANSWER_SUBMITTED',
  'ANSWER_CORRECT',
  'ANSWER_INCORRECT',
  'MATCH_FOUND',
  'MATCH_FAILED',
  'QUESTION_COMPLETED',
]);

export function requiresSense(eventType: string): boolean {
  return SENSE_BOUND_EVENT_TYPES.has(eventType);
}

export class ActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignmentId?: number;

  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  activityType?: ActivityType;

  @IsOptional()
  @IsIn(ACTIVITY_STATUSES)
  status?: ActivityStatus;

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
  @Max(100)
  limit = 20;
}

export class SettingsObjectDto {
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class CreateActivityDto extends SettingsObjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignmentId?: number;

  @IsIn(ACTIVITY_TYPES)
  activityType!: ActivityType;

  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  senseIds?: number[];

  /** When building from an assignment: keep the first N assignment senses. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemCount?: number;

  @IsOptional()
  @IsIn(['manual', 'assignment', 'set', 'assigned', 'due', 'difficult', 'catalog'])
  selection?:
    | 'manual'
    | 'assignment'
    | 'set'
    | 'assigned'
    | 'due'
    | 'difficult'
    | 'catalog';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vocabularySetId?: number;

  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string;
}

export const ACTIVITY_LINK_TYPES = [
  'PERMANENT',
  'EXPIRING',
  'SINGLE_USE',
] as const;

export class CreateActivityLinkDto {
  @IsOptional()
  @IsIn(ACTIVITY_LINK_TYPES)
  linkType: (typeof ACTIVITY_LINK_TYPES)[number] = 'PERMANENT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(31_536_000)
  expiresInSeconds?: number;
}

export class UpdateActivityDto extends SettingsObjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(ACTIVITY_STATUSES)
  status?: ActivityStatus;
}

export class CreateEventDto {
  @IsIn(POSTABLE_EVENT_TYPES)
  eventType!: PostableEventType;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  direction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  response?: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  responseTimeMs?: number;

  /** Normalized FSRS rating. Only accepted on answer events. */
  @IsOptional()
  @IsIn(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  /** Required except for pure lifecycle-free events (always required here). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vocabularySenseId?: number;
}

export class SessionEventListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 200;
}
