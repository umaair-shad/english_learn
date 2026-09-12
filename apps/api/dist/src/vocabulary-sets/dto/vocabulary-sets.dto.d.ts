export declare const SET_SORTS: readonly ["name", "createdAt", "id"];
export type SetSort = (typeof SET_SORTS)[number];
export declare const MAX_SET_ITEMS = 1000;
export declare class SetQueryDto {
    search?: string;
    isActive?: boolean;
    page: number;
    limit: number;
    sort: SetSort;
    order: 'asc' | 'desc';
}
export declare class CreateVocabularySetDto {
    name: string;
    description?: string;
    senseIds?: number[];
}
export declare class UpdateVocabularySetDto {
    name?: string;
    description?: string;
    isActive?: boolean;
}
export declare class SetItemsDto {
    senseIds: number[];
}
export declare const ASSIGNMENT_STATUSES: readonly ["DRAFT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export declare const ASSIGNMENT_SOURCE_TYPES: readonly ["MANUAL", "VOCABULARY_SET"];
export type AssignmentSourceType = (typeof ASSIGNMENT_SOURCE_TYPES)[number];
