"use client";

import { useEffect, useState } from "react";

export const PAGE_LIMITS = [10, 20, 50, 100] as const;
export type PageLimit = (typeof PAGE_LIMITS)[number];

const DEFAULT_LIMIT: PageLimit = 10;

function readLimit(key: string): PageLimit {
  if (typeof window === "undefined") return DEFAULT_LIMIT;
  const raw = window.localStorage.getItem(`page-limit:${key}`);
  const n = Number(raw);
  return PAGE_LIMITS.includes(n as PageLimit) ? (n as PageLimit) : DEFAULT_LIMIT;
}

export function usePageLimit(storageKey: string): {
  limit: PageLimit;
  setLimit: (limit: PageLimit) => void;
} {
  const [limit, setLimitState] = useState<PageLimit>(DEFAULT_LIMIT);

  useEffect(() => {
    setLimitState(readLimit(storageKey));
  }, [storageKey]);

  function setLimit(next: PageLimit) {
    setLimitState(next);
    window.localStorage.setItem(`page-limit:${storageKey}`, String(next));
  }

  return { limit, setLimit };
}
