/**
 * Live Teacher Mirror -- realtime messaging contracts.
 *
 * Sockets are delivery/observation only. `activity_events` remains the single
 * persistent source of truth; nothing under `realtime` ever writes to the
 * database. Mirror payloads are built server-side from already-persisted
 * session/event state and fanned out to the per-student room `student:{id}`.
 */
export type RealtimeRole = 'teacher' | 'student';

/** Server-authoritative event snapshot broadcast after a DB write. */
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

/** Presence view emitted to watchers (and the student's own socket). */
export interface PresencePayload {
  studentId: number;
  online: boolean;
  sessionId: number | null;
  connectedAt: string | null;
  lastSeenAt: string | null;
}

/** Internal presence registry entry. */
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
