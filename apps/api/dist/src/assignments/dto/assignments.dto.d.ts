import { type AssignmentStatus } from '../../vocabulary-sets/dto/vocabulary-sets.dto';
export declare const MAX_ASSIGNMENT_ITEMS = 1000;
export declare class CreateAssignmentDto {
    studentId: number;
    title: string;
    description?: string;
    dueAt?: string;
    senseIds?: number[];
    vocabularySetIds?: number[];
}
export declare class AssignmentQueryDto {
    studentId?: number;
    status?: AssignmentStatus;
    due?: 'overdue' | 'upcoming';
    search?: string;
    page: number;
    limit: number;
}
export declare class UpdateAssignmentDto {
    title?: string;
    description?: string;
    dueAt?: string;
    status?: AssignmentStatus;
}
