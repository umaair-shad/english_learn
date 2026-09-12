import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ASSIGNMENT_STATUSES,
  type AssignmentStatus,
} from '../../vocabulary-sets/dto/vocabulary-sets.dto';

export const MAX_ASSIGNMENT_ITEMS = 1000;

export class CreateAssignmentDto {
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ASSIGNMENT_ITEMS)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  senseIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  vocabularySetIds?: number[];
}

export class AssignmentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES)
  status?: AssignmentStatus;

  @IsOptional()
  @IsIn(['overdue', 'upcoming'])
  due?: 'overdue' | 'upcoming';

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

export class UpdateAssignmentDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES)
  status?: AssignmentStatus;
}
