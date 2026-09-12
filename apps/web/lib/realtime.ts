import type {
  LiveEventPayload,
  LivePresencePayload,
} from "@/lib/api";

/** Derive the WebSocket origin from the API base. The browser talks to the
 *  Next proxy (`/api/v1`), but sockets must hit the API HTTP server directly. */
export function realtimeWsUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
  const origin = apiBase.replace(/\/api\/v1\/?$/, "");
  return origin.replace(/^http/, "ws");
}

export const LIVE_EVENT_COLORS: Record<string, string> = {
  ACTIVITY_STARTED: "text-emerald-600",
  CARD_SHOWN: "text-sky-600",
  ANSWER_SUBMITTED: "text-indigo-600",
  ANSWER_CORRECT: "text-emerald-600",
  ANSWER_INCORRECT: "text-rose-600",
  MATCH_FOUND: "text-emerald-600",
  MATCH_FAILED: "text-rose-600",
  QUESTION_COMPLETED: "text-blue-600",
  PAUSED: "text-amber-600",
  RESUMED: "text-cyan-600",
  FINISHED: "text-violet-600",
};

export function describeLiveEvent(event: LiveEventPayload): string {
  switch (event.eventType) {
    case "ACTIVITY_STARTED":
      return "started the activity";
    case "CARD_SHOWN":
      return "a flashcard was shown";
    case "ANSWER_SUBMITTED":
      return "submitted an answer";
    case "ANSWER_CORRECT":
      return event.rating ? `answered correctly (${event.rating})` : "answered correctly";
    case "ANSWER_INCORRECT":
      return "answered incorrectly";
    case "MATCH_FOUND":
      return "flipped a matching pair";
    case "MATCH_FAILED":
      return "flipped a non-matching pair";
    case "QUESTION_COMPLETED":
      return "completed a question";
    case "PAUSED":
      return "paused the activity";
    case "RESUMED":
      return "resumed the activity";
    case "FINISHED":
      return "finished the activity";
    default:
      return event.eventType.toLowerCase().replace(/_/g, " ");
  }
}

export type LiveEventHandlers = {
  onEvent?: (payload: LiveEventPayload) => void;
  onPresence?: (payload: LivePresencePayload) => void;
  onDisconnect?: () => void;
};