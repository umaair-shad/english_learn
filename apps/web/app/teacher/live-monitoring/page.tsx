"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import {
  api,
  type ActivityDetail,
  type ActivitySessionDetail,
  type LiveEventPayload,
  type LivePresencePayload,
  type LiveStudent,
} from "@/lib/api";
import { LIVE_EVENT_COLORS, describeLiveEvent, realtimeWsUrl } from "@/lib/realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "cn";

interface LiveEntry {
  payload: LiveEventPayload;
  ts: string;
}

interface ActivityMeta {
  activityId: number;
  title: string;
  activityType: string;
  senses: Record<number, string>;
}

const EVENT_LOG_CAP = 200;

export default function LiveMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LiveBoard />
    </Suspense>
  );
}

function LiveBoard() {
  const searchParams = useSearchParams();
  const focusParam = Number(searchParams.get("focus") ?? 0);

  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isInteger(focusParam) && focusParam > 0 ? focusParam : null,
  );
  const [connection, setConnection] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );
  const [presence, setPresence] = useState<Record<number, LivePresencePayload>>({});
  const [latest, setLatest] = useState<Record<number, LiveEventPayload>>({});
  const [logs, setLogs] = useState<Record<number, LiveEntry[]>>({});
  const [activityMeta, setActivityMeta] = useState<Record<number, ActivityMeta>>({});

  const socketRef = useRef<Socket | null>(null);
  const studentsRef = useRef<LiveStudent[]>([]);
  const watchedRef = useRef<Set<number>>(new Set());
  const fetchedMetaRef = useRef<Set<number>>(new Set());
  const seededSessionsRef = useRef<Set<number>>(new Set());

  const snapshotQuery = useQuery({
    queryKey: ["live-snapshot"],
    queryFn: () => api.realtimeLive(),
  });

  // HTTP snapshot merged with incremental socket presence. DB stays the source
  // of truth; presence only overlays "online" state.
  const students = useMemo(() => {
    const base = snapshotQuery.data ?? [];
    const map = new Map(base.map((s) => [s.studentId, s] as const));
    for (const p of Object.values(presence)) {
      const s = map.get(p.studentId);
      if (s) {
        map.set(p.studentId, {
          ...s,
          online: p.online,
          sessionId: p.sessionId,
          connectedAt: p.connectedAt,
          lastSeenAt: p.lastSeenAt,
        });
      }
    }
    return [...map.values()];
  }, [snapshotQuery.data, presence]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  function ensureWatched(studentId: number) {
    if (watchedRef.current.has(studentId)) return;
    watchedRef.current.add(studentId);
    socketRef.current?.emit("live:watch", { studentId });
  }

  // Subscribe to watched rooms whenever the roster changes (initial snapshot,
  // reconnect, presence join).
  useEffect(() => {
    for (const s of students) {
      if (s.online) ensureWatched(s.studentId);
    }
  }, [students]);

  async function loadActivityMeta(payload: LiveEventPayload) {
    if (!payload.activityId || fetchedMetaRef.current.has(payload.activityId)) return;
    const activityId = payload.activityId;
    fetchedMetaRef.current.add(activityId);
    try {
      const detail: ActivityDetail = await api.getActivity(activityId);
      const senses: Record<number, string> = {};
      for (const item of detail.items) senses[item.senseId] = item.lemma;
      setActivityMeta((prev) => ({
        ...prev,
        [activityId]: {
          activityId,
          title: detail.title,
          activityType: detail.activityType,
          senses,
        },
      }));
    } catch {
      fetchedMetaRef.current.delete(activityId);
    }
  }

  // Teacher socket: watch owned students and apply incremental mirrors over the
  // HTTP snapshot. This channel only observes, never writes.
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const { accessToken } = await api.realtimeCredentials();
        if (disposed) return;
        const socket = io(realtimeWsUrl(), {
          auth: { role: "teacher", token: accessToken },
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1_000,
          reconnectionDelayMax: 5_000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnection("connected");
          for (const s of studentsRef.current) {
            if (s.online) ensureWatched(s.studentId);
          }
        });
        socket.on("disconnect", () => {
          setConnection("connecting");
        });
        socket.on("connect_error", () => {
          setConnection("error");
        });

        socket.on("live:presence", (p: LivePresencePayload) => {
          if (typeof p?.studentId !== "number") return;
          setPresence((prev) => ({ ...prev, [p.studentId]: p }));
          if (p.online) ensureWatched(p.studentId);
        });

        socket.on("live:event", (payload: LiveEventPayload) => {
          if (payload.kind !== "event" || typeof payload.studentId !== "number") return;
          setLatest((prev) => ({ ...prev, [payload.studentId]: payload }));
          setLogs((prev) => {
            const list = prev[payload.studentId] ?? [];
            const next = [...list, { payload, ts: payload.occurredAt }];
            if (next.length > EVENT_LOG_CAP) next.splice(0, next.length - EVENT_LOG_CAP);
            return { ...prev, [payload.studentId]: next };
          });
          void loadActivityMeta(payload);
        });
      } catch {
        setConnection("error");
      }
    })();
    return () => {
      disposed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const selected = useMemo(
    () => students.find((s) => s.studentId === selectedId) ?? null,
    [students, selectedId],
  );

  const baselineQuery = useQuery({
    queryKey: ["live-session-baseline", selected?.sessionId ?? 0],
    queryFn: () => api.getSession(selected?.sessionId as number),
    enabled: !!selected?.sessionId,
  });

  // Focused monitor: seed the feed from persisted events once (HTTP), then the
  // socket stream appends live increments on top.
  useEffect(() => {
    if (!selected || !selected.sessionId) return;
    const sessionId = selected.sessionId;
    if (seededSessionsRef.current.has(sessionId)) return;
    seededSessionsRef.current.add(sessionId);
    void (async () => {
      try {
        const res = await api.sessionEvents(sessionId, { limit: EVENT_LOG_CAP });
        setLogs((prev) => {
          if ((prev[selected.studentId] ?? []).length > 0) return prev;
          const list: LiveEntry[] = res.data.map((e) => ({
            ts: e.occurredAt,
            payload: {
              kind: "event",
              studentId: selected.studentId,
              sessionId,
              activityId: null,
              activityTitle: null,
              activityType: null,
              status: null,
              eventType: e.eventType,
              itemIndex: null,
              totalItems: 0,
              completedCount: 0,
              correctCount: 0,
              incorrectCount: 0,
              progress: 0,
              senseId: e.sense?.senseId ?? null,
              rating: null,
              direction: e.direction,
              response: e.response,
              occurredAt: e.occurredAt,
            },
          }));
          return { ...prev, [selected.studentId]: list };
        });
      } catch {
        // events are optional on first focus; socket stream still works
      }
    })();
  }, [selected]);

  const lastEvent = selectedId ? latest[selectedId] : undefined;
  const meta = lastEvent?.activityId ? activityMeta[lastEvent.activityId] : undefined;
  const liveEntries = (logs[selectedId ?? -1] ?? []).slice(-150).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Live Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Watch your students&apos; activities in near-real time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge connection={connection} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void snapshotQuery.refetch()}
            disabled={snapshotQuery.isFetching}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {snapshotQuery.isLoading && students.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Loader2 className="mx-auto mb-3 size-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading students…</p>
              </CardContent>
            </Card>
          )}
          {snapshotQuery.isError && students.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Could not reach the live stream. Refresh to retry.
              </CardContent>
            </Card>
          )}
          {students.map((s) => (
            <button
              key={s.studentId}
              onClick={() => setSelectedId(s.studentId)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selectedId === s.studentId
                  ? "border-primary bg-accent"
                  : "hover:bg-accent/60",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.displayName}</span>
                <OnlineBadge online={s.online} />
              </div>
              {s.online && s.sessionId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Session #{s.sessionId}
                </p>
              )}
              {latest[s.studentId] && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {latest[s.studentId].activityTitle} ·{" "}
                  <span className={LIVE_EVENT_COLORS[latest[s.studentId].eventType] ?? ""}>
                    {describeLiveEvent(latest[s.studentId])}
                  </span>
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-2">
          {selected === null && (
            <Card>
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                <Radio className="mx-auto mb-3 size-8 opacity-40" />
                Select a student to start watching.
              </CardContent>
            </Card>
          )}

          {selected !== null && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selected.displayName}
                        <OnlineBadge online={selected.online} />
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {lastEvent?.activityTitle ?? meta?.title ?? "No activity started yet"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {lastEvent?.status ?? baselineQuery.data?.status ?? "—"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressStats
                    event={lastEvent}
                    baseline={baselineQuery.data ?? null}
                    totalItems={meta ? Object.keys(meta.senses).length : 0}
                  />
                  {lastEvent?.senseId && meta?.senses && (
                    <p className="text-sm text-muted-foreground">
                      Now on:{" "}
                      <span className="font-medium text-foreground">
                        {meta.senses[lastEvent.senseId] ?? `sense #${lastEvent.senseId}`}
                      </span>
                      {lastEvent.itemIndex ? ` · card ${lastEvent.itemIndex}` : ""}
                    </p>
                  )}
                  <LiveStatePanel state={lastEvent?.liveState ?? null} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Live activity feed</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[28rem] space-y-1 overflow-y-auto">
                  {liveEntries.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Waiting for live activity events…
                    </p>
                  )}
                  {liveEntries.map((entry, i) => (
                    <div
                      key={`${entry.payload.sessionId}-${entry.payload.occurredAt}-${i}`}
                      className="flex items-start gap-3 rounded-md p-2 text-sm hover:bg-muted/60"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          LIVE_EVENT_COLORS[entry.payload.eventType] ?? "bg-muted-foreground/50",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div>
                          <span
                            className={cn(
                              "font-medium",
                              LIVE_EVENT_COLORS[entry.payload.eventType] ?? "",
                            )}
                          >
                            {describeLiveEvent(entry.payload)}
                          </span>
                          {entry.payload.rating && (
                            <span className="ml-2 text-xs">
                              rating {entry.payload.rating}
                            </span>
                          )}
                          {entry.payload.senseId && meta?.senses?.[entry.payload.senseId] && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {meta.senses[entry.payload.senseId]}
                            </span>
                          )}
                        </div>
                        {entry.payload.response && (
                          <p className="truncate text-xs text-muted-foreground">
                            “{entry.payload.response}”
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressStats({
  event,
  baseline,
  totalItems,
}: {
  event: LiveEventPayload | undefined;
  baseline: ActivitySessionDetail | null;
  totalItems: number;
}) {
  const progress = event?.progress ?? baseline?.percentComplete ?? 0;
  const max = Math.max(totalItems, event?.totalItems ?? baseline?.totalItems ?? 0, 1);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>
          {event?.completedCount ?? baseline?.completedCount ?? 0} of {max} completed
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <div className="flex gap-6 text-sm">
        <span className="text-emerald-600">
          {event?.correctCount ?? baseline?.correctCount ?? 0} correct
        </span>
        <span className="text-rose-600">
          {event?.incorrectCount ?? baseline?.incorrectCount ?? 0} incorrect
        </span>
      </div>
    </div>
  );
}

function OnlineBadge({ online }: { online: boolean }) {
  return online ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <Wifi className="size-3" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <WifiOff className="size-3" />
      Offline
    </span>
  );
}

function ConnectionBadge({
  connection,
}: {
  connection: "connecting" | "connected" | "error";
}) {
  if (connection === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Wifi className="size-3.5" />
        Live connection
      </span>
    );
  }
  if (connection === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
        <WifiOff className="size-3.5" />
        Connection failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      Connecting…
    </span>
  );
}

function LiveStatePanel({ state }: { state: Record<string, unknown> | null }) {
  if (!state) return null;
  const kind = String(state.kind ?? "");
  if (kind === "flashcards") {
    return (
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">Flashcard</p>
        <p>
          Card {String(state.cardNumber ?? "—")} of {String(state.total ?? "—")} ·{" "}
          {String(state.direction ?? "")}
        </p>
        <p className="mt-1">{String(state.lemma ?? "")}</p>
        {state.revealed ? (
          <p className="text-muted-foreground">{String(state.translation ?? "")}</p>
        ) : (
          <p className="text-muted-foreground">Card hidden</p>
        )}
      </div>
    );
  }
  if (kind === "memory") {
    const flipped = Array.isArray(state.flipped) ? state.flipped.map(String) : [];
    return (
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">Memory board</p>
        <p>
          Matched {String(state.matched ?? 0)} / {String(state.totalPairs ?? 0)} ·
          score {String(state.score ?? 0)}
        </p>
        {flipped.length > 0 ? (
          <p className="mt-1 text-muted-foreground">Flipped: {flipped.join(" · ")}</p>
        ) : null}
      </div>
    );
  }
  if (kind === "quiz") {
    const options = Array.isArray(state.options) ? state.options.map(String) : [];
    return (
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">Quiz</p>
        <p>
          Question {String(state.index ?? "—")} of {String(state.total ?? "—")} ·
          score {String(state.score ?? 0)}
        </p>
        <p className="mt-1">{String(state.question ?? "")}</p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          {options.map((opt) => (
            <li key={opt} className={opt === state.selected ? "font-medium text-foreground" : ""}>
              {opt}
              {opt === state.selected ? " ← selected" : ""}
            </li>
          ))}
        </ul>
        {state.correct === true ? (
          <p className="mt-1 text-emerald-600">Correct</p>
        ) : state.correct === false ? (
          <p className="mt-1 text-rose-600">Incorrect</p>
        ) : null}
      </div>
    );
  }
  return null;
}