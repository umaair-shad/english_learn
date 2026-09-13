export type RealtimeRole = 'teacher' | 'student';
export interface MirrorPayload {
    kind: 'event';
    studentId: number;
    sessionId: number | null;
    activityId: number | null;
    activityTitle: string | null;
    activityType: string | null;
    status: string | null;
    eventType: string;
    itemIndex: number | null;
    totalItems: number;
    completedCount: number;
    correctCount: number;
    incorrectCount: number;
    progress: number;
    senseId: number | null;
    rating: string | null;
    direction: string | null;
    response: string | null;
    liveState: Record<string, unknown> | null;
    occurredAt: string;
}
export interface PresencePayload {
    studentId: number;
    online: boolean;
    sessionId: number | null;
    connectedAt: string | null;
    lastSeenAt: string | null;
}
export interface PresenceRecord extends PresencePayload {
    socketId: string;
    socketIds: Set<string>;
    sessions: Map<string, number | null>;
}
export interface WatchResult {
    studentId: number;
    allowed: boolean;
    reason?: string;
    presence: PresencePayload | null;
}
export interface LiveStudentDto {
    studentId: number;
    displayName: string;
    firstName: string;
    lastName: string | null;
    online: boolean;
    sessionId: number | null;
    connectedAt: string | null;
    lastSeenAt: string | null;
}
