import type { ActivityItem, CreateEventRequest } from "@/lib/api";

export interface GameplayProps {
  items: ActivityItem[];
  /** Session is currently paused — all interactions are disabled. */
  paused: boolean;
  /** A request is in flight — interactions are disabled. */
  busy: boolean;
  settings?: Record<string, unknown> | null;
  /** Submit standardized events for the current session (in order). Returns false on failure. */
  submit: (events: CreateEventRequest[]) => Promise<boolean>;
  /** All items have been answered — the caller finishes the session. */
  onComplete: () => void;
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function firstTranslation(item: ActivityItem): string | null {
  return item.translations.length > 0 ? item.translations[0].text : null;
}