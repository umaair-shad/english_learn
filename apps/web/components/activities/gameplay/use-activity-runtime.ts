"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ActivityDetail,
  ActivitySessionDetail,
  CreateEventRequest,
  LatestSession,
} from "@/lib/api";
import { realtimeWsUrl } from "@/lib/realtime";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

export type GameplayPhase = "idle" | "playing" | "finished";

function storageKey(activityId: number) {
  return `activity-session:${activityId}`;
}

export interface ActivityRuntime {
  activity: ActivityDetail | undefined;
  activityLoading: boolean;
  activityError: string | null;
  latestSession: LatestSession | null;
  session: ActivitySessionDetail | null;
  phase: GameplayPhase;
  busy: boolean;
  error: string | null;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<void>;
  submitEvents: (events: CreateEventRequest[]) => Promise<boolean>;
  clearError: () => void;
}

export function useActivityRuntime(
  token: string,
  activityId: number,
  mode: "student" | "play" = "student",
): ActivityRuntime {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ActivitySessionDetail | null>(null);
  const [phase, setPhase] = useState<GameplayPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<ActivitySessionDetail | null>(null);
  const resumingRef = useRef(false);
  const mountedRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Live mirror presence -- purely observational. Any failure here must never
  // affect gameplay, so every socket interaction is best-effort.
  useEffect(() => {
    if (!token) return;
    let disposed = false;
    const notify = () => {
      const current = sessionRef.current;
      socketRef.current?.emit("live:identify", {
        sessionId: current?.id ?? null,
      });
    };
    try {
      const socket = io(realtimeWsUrl(), {
        auth: { role: "student", token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 5_000,
      });
      socketRef.current = socket;
      socket.on("connect", () => {
        if (disposed) return;
        socket.emit("live:heartbeat");
        notify();
      });
      socket.on("live:ready", () => {
        if (disposed) return;
        notify();
        socket.emit("live:heartbeat");
      });
    } catch {
      // non-blocking: no socket = no live mirror, gameplay continues.
    }
    const heartbeat = globalThis.setInterval(() => {
      socketRef.current?.emit("live:heartbeat");
    }, 25_000);
    return () => {
      disposed = true;
      globalThis.clearInterval(heartbeat);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const { data: activity, isLoading: activityLoading, isError: activityError } = useQuery({
    queryKey: ["student-activity", mode, token, activityId],
    queryFn: async () => {
      if (mode === "play") {
        const resolved = await api.resolvePlayAccess(token);
        return resolved.activity;
      }
      return api.accessActivity(token, activityId);
    },
    enabled: !!token && (mode === "play" || Number.isInteger(activityId)),
    retry: false,
  });

  const { data: listings } = useQuery({
    queryKey: ["student-access-activities", token],
    queryFn: () => api.accessActivities(token),
    enabled: !!token && mode === "student",
    retry: false,
  });

  const latestSession =
    listings?.find((a) => a.id === activityId)?.latestSession ?? null;

  useEffect(() => {
    if (resumingRef.current) return;
    resumingRef.current = true;
    const raw = globalThis.localStorage.getItem(storageKey(activityId));
    if (!raw) return;
    const storedId = Number(raw);
    if (!Number.isInteger(storedId)) {
      globalThis.localStorage.removeItem(storageKey(activityId));
      return;
    }
    const load = mode === "play"
      ? api.playSession(token, storedId)
      : api.accessSession(token, storedId);
    load
      .then((s) => {
        if (!mountedRef.current) return;
        if (s.status === "ACTIVE" || s.status === "PAUSED") {
          sessionRef.current = s;
          setSession(s);
          setPhase("playing");
          notifyPresence();
        } else {
          globalThis.localStorage.removeItem(storageKey(activityId));
        }
      })
      .catch(() => {
        globalThis.localStorage.removeItem(storageKey(activityId));
      });
  }, [token, activityId]);

  function setSessionState(s: ActivitySessionDetail) {
    sessionRef.current = s;
    setSession(s);
    queryClient.invalidateQueries({
      queryKey: ["student-activity", token, activityId],
    });
    queryClient.invalidateQueries({
      queryKey: ["student-access-activities", token],
    });
    notifyPresence();
  }

  function notifyPresence() {
    const current = sessionRef.current;
    socketRef.current?.emit("live:identify", {
      sessionId: current?.id ?? null,
    });
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "play"
          ? await api.playStart(token)
          : await api.accessStartActivity(token, activityId);
      if (!mountedRef.current) return;
      sessionRef.current = result.session;
      setSession(result.session);
      setPhase("playing");
      globalThis.localStorage.setItem(
        storageKey(activityId),
        String(result.session.id),
      );
      notifyPresence();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the activity.");
    } finally {
      setBusy(false);
    }
  }

  async function pause() {
    const s = sessionRef.current;
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      const updated =
        mode === "play"
          ? await api.playPause(token, s.id)
          : await api.accessPauseSession(token, s.id);
      if (mountedRef.current) setSessionState(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pause the session.");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    const s = sessionRef.current;
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      const updated =
        mode === "play"
          ? await api.playResume(token, s.id)
          : await api.accessResumeSession(token, s.id);
      if (mountedRef.current) setSessionState(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resume the session.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    const s = sessionRef.current;
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      const updated =
        mode === "play"
          ? await api.playFinish(token, s.id)
          : await api.accessFinishSession(token, s.id);
      if (!mountedRef.current) return;
      setSessionState(updated);
      setPhase("finished");
      globalThis.localStorage.removeItem(storageKey(activityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish the session.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEvents(events: CreateEventRequest[]) {
    const startSession = sessionRef.current;
    if (!startSession || startSession.status !== "ACTIVE") return false;
    setBusy(true);
    setError(null);
    try {
      let current = startSession;
      for (const event of events) {
        current =
          mode === "play"
            ? await api.playRecordEvent(token, current.id, event)
            : await api.accessRecordEvent(token, current.id, event);
      }
      if (mountedRef.current) setSessionState(current);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your answer.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    activity,
    activityLoading,
    activityError: activityError ? "This activity is not available." : null,
    latestSession,
    session,
    phase,
    busy,
    error,
    start,
    pause,
    resume,
    finish,
    submitEvents,
    clearError: () => setError(null),
  };
}