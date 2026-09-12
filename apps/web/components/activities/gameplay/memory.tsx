"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import type { ActivityItem } from "@/lib/api";
import { GameplayProps, shuffle } from "./gameplay-types";

interface CardView {
  key: string;
  senseId: number;
  kind: "en" | "pl";
  text: string;
  helper?: string;
}

// English ↔ Polish pairs built per sense. Pairs are matched by sense id so
// duplicate lemmas (e.g. two "bank" senses) never collide.
function buildCards(items: ActivityItem[]): CardView[] {
  const pairs = items.flatMap((item, i) => {
    const en: CardView = {
      key: `${i}-en`,
      senseId: item.senseId,
      kind: "en",
      text: item.lemma,
    };
    let pl: CardView;
    if (item.translations.length > 0) {
      pl = {
        key: `${i}-pl`,
        senseId: item.senseId,
        kind: "pl",
        text: item.translations[0].text,
      };
    } else {
      pl = {
        key: `${i}-pl`,
        senseId: item.senseId,
        kind: "pl",
        text: item.definition || item.lemma,
        helper: "definition",
      };
    }
    return [en, pl];
  });
  return shuffle(pairs);
}

export function MemoryGameplay({ items, paused, busy, submit, onComplete }: GameplayProps) {
  const cards = useState(() => buildCards(items))[0];
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const totalPairs = items.length;
  const resolved = matched.size;

  async function flip(key: string) {
    if (paused || busy) return;
    const card = cards.find((c) => c.key === key);
    if (!card) return;
    if (matched.has(card.senseId)) return;
    if (flipped.has(key)) return;
    if (wrong) setWrong(null);

    const next = new Set(flipped);
    next.add(key);
    setFlipped(next);

    const selected = cards.filter(
      (c) => next.has(c.key) && !matched.has(c.senseId),
    );
    if (selected.length < 2) return;

    const [first, second] = selected;
    if (first.senseId === second.senseId) {
      // A resolved pair: record the match, then drive FSRS via the shared
      // answer event so the learning result flows through the standard bridge.
      const ok = await submit([
        {
          eventType: "MATCH_FOUND",
          vocabularySenseId: first.senseId,
          metadata: {
            liveState: {
              kind: "memory",
              flipped: [first.text, second.text],
              matched: resolved + 1,
              totalPairs,
              score: resolved + 1,
            },
          },
        },
        {
          eventType: "ANSWER_CORRECT",
          vocabularySenseId: first.senseId,
          rating: "GOOD",
          response: first.text,
        },
      ]);
      if (!ok) {
        setLocalError("Could not save the match. Please try again.");
        setFlipped(new Set());
        return;
      }
      setLocalError(null);
      setMatched((prev) => {
        const updated = new Set(prev);
        updated.add(first.senseId);
        return updated;
      });
      if (resolved + 1 >= totalPairs) {
        onComplete();
      }
    } else {
      const ok = await submit([
        {
          eventType: "MATCH_FAILED",
          vocabularySenseId: second.senseId,
          response: `${first.text} / ${second.text}`,
          metadata: {
            liveState: {
              kind: "memory",
              flipped: [first.text, second.text],
              matched: resolved,
              totalPairs,
              score: resolved,
              failed: true,
            },
          },
        },
      ]);
      if (!ok) {
        setLocalError("Could not save the miss. Please try again.");
        setFlipped(new Set());
        return;
      }
      setLocalError(null);
      setWrong([first.key, second.key]);
      setFlipped(new Set());
    }
  }

  if (totalPairs === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This activity has no pairs to match.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Match each English word to its Polish translation.</span>
        <span>
          {resolved}/{totalPairs} matched
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((card) => {
          const isMatched = matched.has(card.senseId);
          const isFlipped = flipped.has(card.key) || isMatched;
          const isWrong = wrong !== null && wrong.includes(card.key);
          let cardClass =
            "flex min-h-20 flex-col justify-center rounded-md border p-3 text-sm";
          if (isMatched) {
            cardClass += " border-emerald-300 bg-emerald-50";
          } else if (isWrong) {
            cardClass += " border-red-300 bg-red-50";
          } else if (isFlipped) {
            cardClass += " border-primary/40 bg-card";
          } else {
            cardClass += " cursor-pointer border-muted-foreground/30 bg-muted/40 hover:bg-muted";
          }
          return (
            <button
              key={card.key}
              type="button"
              disabled={paused || busy || isMatched || isFlipped}
              onClick={() => flip(card.key)}
              className={cardClass}
            >
              {isFlipped ? (
                <>
                  <span
                    className={
                      card.kind === "en"
                        ? "font-semibold text-sky-700"
                        : "font-semibold text-purple-700"
                    }
                  >
                    {card.text}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {card.kind === "en" ? "English" : card.kind === "pl" && card.helper ? "Definition" : "Polski"}
                  </span>
                </>
              ) : (
                <RefreshCcw className="mx-auto size-5 text-muted-foreground/60" />
              )}
            </button>
          );
        })}
      </div>

      {resolved >= totalPairs ? (
        <p className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="size-4" /> All pairs matched.
        </p>
      ) : wrong ? (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="size-4" /> Not a match — try again.
        </p>
      ) : null}

      {localError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="size-4" /> {localError}
        </p>
      ) : null}
    </div>
  );
}