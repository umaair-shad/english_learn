export declare const LEARNING_STATUSES: readonly ["ASSIGNED", "ENCOUNTERED", "LEARNING", "REVIEWING", "MASTERED"];
export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export declare const REVIEW_RATINGS: readonly ["AGAIN", "HARD", "GOOD", "EASY"];
export type ReviewRating = (typeof REVIEW_RATINGS)[number];
export declare const SOURCE_TYPES: readonly ["manual", "activity"];
export type SourceType = (typeof SOURCE_TYPES)[number];
declare const CEFR_LEVELS: readonly ["A1", "A2", "B1", "B2", "C1", "C2"];
export declare class StudentVocabularyQueryDto {
    status?: LearningStatus;
    cefr?: (typeof CEFR_LEVELS)[number];
    partOfSpeech?: string;
    due?: boolean;
    search?: string;
    page: number;
    limit: number;
}
export declare class AssignSenseDto {
    sourceType?: string;
}
export declare class ReviewSenseDto {
    rating: ReviewRating;
    responseTimeMs?: number;
    sourceType: SourceType;
    sourceId?: number;
}
export declare class OverrideStateDto {
    status: LearningStatus;
    forceDue?: boolean;
}
export declare class DueReviewsQueryDto {
    page: number;
    limit: number;
}
export {};
