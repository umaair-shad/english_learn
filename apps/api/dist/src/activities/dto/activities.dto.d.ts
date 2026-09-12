export declare const ACTIVITY_TYPES: readonly ["FLASHCARDS", "MEMORY", "QUIZ", "FILL_BLANK"];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export declare const ACTIVITY_STATUSES: readonly ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export declare const SESSION_STATUSES: readonly ["ACTIVE", "PAUSED", "FINISHED", "ABANDONED"];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export declare const ACTIVITY_EVENT_TYPES: readonly ["ACTIVITY_STARTED", "CARD_SHOWN", "ANSWER_SUBMITTED", "ANSWER_CORRECT", "ANSWER_INCORRECT", "MATCH_FOUND", "MATCH_FAILED", "QUESTION_COMPLETED", "PAUSED", "RESUMED", "FINISHED"];
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];
export declare const POSTABLE_EVENT_TYPES: readonly ["CARD_SHOWN", "ANSWER_SUBMITTED", "ANSWER_CORRECT", "ANSWER_INCORRECT", "MATCH_FOUND", "MATCH_FAILED", "QUESTION_COMPLETED"];
export type PostableEventType = (typeof POSTABLE_EVENT_TYPES)[number];
export declare function requiresSense(eventType: string): boolean;
export declare class ActivityQueryDto {
    studentId?: number;
    assignmentId?: number;
    activityType?: ActivityType;
    status?: ActivityStatus;
    search?: string;
    page: number;
    limit: number;
}
export declare class SettingsObjectDto {
    settings?: Record<string, unknown>;
}
export declare class CreateActivityDto extends SettingsObjectDto {
    studentId: number;
    assignmentId?: number;
    activityType: ActivityType;
    title: string;
    description?: string;
    senseIds?: number[];
    itemCount?: number;
    selection?: 'manual' | 'assignment' | 'set' | 'assigned' | 'due' | 'difficult' | 'catalog';
    vocabularySetId?: number;
    cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    category?: string;
    partOfSpeech?: string;
}
export declare const ACTIVITY_LINK_TYPES: readonly ["PERMANENT", "EXPIRING", "SINGLE_USE"];
export declare class CreateActivityLinkDto {
    linkType: (typeof ACTIVITY_LINK_TYPES)[number];
    expiresInSeconds?: number;
}
export declare class UpdateActivityDto extends SettingsObjectDto {
    title?: string;
    description?: string;
    status?: ActivityStatus;
}
export declare class CreateEventDto {
    eventType: PostableEventType;
    direction?: string;
    response?: string;
    isCorrect?: boolean;
    responseTimeMs?: number;
    rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
    metadata?: Record<string, unknown>;
    vocabularySenseId?: number;
}
export declare class SessionEventListQueryDto {
    page: number;
    limit: number;
}
