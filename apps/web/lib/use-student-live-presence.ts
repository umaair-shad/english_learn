"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { realtimeWsUrl } from "@/lib/realtime";

/** Marks the student online on the teacher live board for as long as this
 *  token page is open. Gameplay can open a second socket; the API keeps
 *  presence until the last one disconnects. */
export function useStudentLivePresence(token: string | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    let disposed = false;
    try {
      const socket = io(realtimeWsUrl(), {
        auth: { role: "student", token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 5_000,
      });
      socketRef.current = socket;
      const pulse = () => {
        if (disposed) return;
        socket.emit("live:heartbeat");
        socket.emit("live:identify", { sessionId: null });
      };
      socket.on("connect", pulse);
      socket.on("live:ready", pulse);
    } catch {
      // Presence is observational; a closed socket must not break the page.
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
}
