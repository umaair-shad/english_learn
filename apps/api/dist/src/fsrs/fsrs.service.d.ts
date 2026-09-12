export type FsrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type FsrsStateName = 'New' | 'Learning' | 'Review' | 'Relearning';
export interface FsrsCardInput {
    due: Date | null;
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    state: FsrsStateName;
    lastReview: Date | null;
}
export interface FsrsReviewOutcome {
    due: Date;
    stability: number;
    difficulty: number;
    state: FsrsStateName;
    reps: number;
    lapses: number;
    lastReview: Date;
    retrievability: number;
    scheduledDays: number;
}
export declare const FSRS_STATE_NAMES: FsrsStateName[];
export declare class FsrsService {
    private readonly scheduler;
    constructor();
    review(input: FsrsCardInput, rating: FsrsRating, now: Date): FsrsReviewOutcome;
    retrievability(stability: number | null, lastReview: Date | null, now: Date, due?: Date | null): number | null;
    private retrievabilityOf;
    private toStateName;
}
