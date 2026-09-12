"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
} from "lucide-react";
import type { ReviewRating } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GameplayProps, shuffle } from "./gameplay-types";

const RATINGS: Array<{ rating: ReviewRating; label: string; className: string }> = [
  { rating: "AGAIN", label: "Again", className: "bg-red-600 hover:bg-red-700" },
  { rating: "HARD", label: "Hard", className: "bg-amber-600 hover:bg-amber-700" },
  { rating: "GOOD", label: "Good", className: "bg-emerald-600 hover:bg-emerald-700" },
  { rating: "EASY", label: "Easy", className: "bg-sky-600 hover:bg-sky-700" },
];

export function FlashcardsGameplay({ items, paused, busy, settings, submit, onComplete }: GameplayProps) {
  const directionSetting = String(settings?.direction ?? "EN_PL");
  const [pass, setPass] = useState(0);
  const direction =
    directionSetting === "BOTH"
      ? pass % 2 === 0
        ? "EN_PL"
        : "PL_EN"
      : directionSetting === "PL_EN"
        ? "PL_EN"
        : "EN_PL";
  const deck = useState(() => shuffle(items))[0];
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [rated, setRated] = useState<Set<number>>(() => new Set());
  const [revealedAt, setRevealedAt] = useState<Record<number, number>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  const current = deck[index];
  const total = deck.length;
  const answered = rated.size;
  const disabled = paused || busy;

  function nextUnrated(from: number): number {
    for (let offset = 1; offset <= total; offset += 1) {
      const i = (from + offset) % total;
      if (!rated.has(deck[i].senseId)) return i;
    }
    return from;
  }

  async function reveal() {
    if (disabled) return;
    const senseId = current.senseId;
    if (revealed.has(senseId)) return;
    await submit([
      {
        eventType: "CARD_SHOWN",
        vocabularySenseId: senseId,
        direction: direction === "PL_EN" ? "pl->en" : "en->pl",
        metadata: {
          liveState: {
            kind: "flashcards",
            cardNumber: index + 1,
            total,
            revealed: true,
            lemma: current.lemma,
            translation: current.translations.map((t) => t.text).join(", "),
            direction,
          },
        },
      },
    ]);
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(senseId);
      return next;
    });
    setRevealedAt((prev) => ({ ...prev, [senseId]: Date.now() }));
  }

  async function rate(rating: ReviewRating, responseTimeMs?: number) {
    if (disabled) return;
    const senseId = current.senseId;
    if (!revealed.has(senseId) || rated.has(senseId)) return;
    const event =
      rating === "AGAIN"
        ? {
            eventType: "ANSWER_INCORRECT" as const,
            rating,
            vocabularySenseId: senseId,
            responseTimeMs,
          }
        : {
            eventType: "ANSWER_CORRECT" as const,
            rating,
            vocabularySenseId: senseId,
            responseTimeMs,
          };
    const ok = await submit([event]);
    if (!ok) {
      setLocalError("Could not save your rating. Please try again.");
      return;
    }
    setLocalError(null);
    setRated((prev) => {
      const next = new Set(prev);
      next.add(senseId);
      return next;
    });
    if (answered + 1 >= total) {
      if (directionSetting === "BOTH" && pass === 0) {
        setPass(1);
        setRated(new Set());
        setRevealed(new Set());
        setIndex(0);
        return;
      }
      onComplete();
      return;
    }
    setIndex(nextUnrated(index));
  }

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This activity has no cards.
      </p>
    );
  }

  const shown = revealed.has(current.senseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Card {index + 1} of {total}
        </span>
        <span>
          {answered}/{total} rated
        </span>
      </div>

      <Card className={shown ? "" : "border-dashed"}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{shown ? "Back" : "Front"}</CardTitle>
          {current.cefrLevels.length > 0 ? (
            <div className="flex gap-1">
              {current.cefrLevels.slice(0, 2).map((level) => (
                <Badge key={level} variant="outline" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-semibold">
            {direction === "PL_EN"
              ? current.translations.map((t) => t.text).join(", ") || current.definition
              : current.lemma}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{current.partOfSpeech || "—"}</span>
            <span>{direction === "PL_EN" ? "Polish → English" : "English → Polish"}</span>
            {shown ? (
              <span className="text-base text-primary">
                {direction === "PL_EN"
                  ? current.lemma
                  : current.translations.map((t) => t.text).join(", ")}
              </span>
            ) : null}
          </div>

          {shown ? (
            <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
              {current.translations.length > 0 ? (
                <p className="font-medium text-primary">
                  {current.translations.map((t) => t.text).join(", ")}
                </p>
              ) : null}
              {current.definition ? (
                <p>{current.definition}</p>
              ) : null}
              {current.examples.length > 0 ? (
                <p className="italic text-muted-foreground">
                  {current.examples[0]}
                </p>
              ) : null}
              {current.translations.length === 0 && !current.definition ? (
                <p className="text-muted-foreground">No details for this word.</p>
              ) : null}
            </div>
          ) : null}

          {total > 1 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndex((index - 1 + total) % total)}
                disabled={disabled}
              >
                <ChevronLeft className="mr-1 size-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndex((index + 1) % total)}
                disabled={disabled}
              >
                Next <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {rated.has(current.senseId) ? (
        <p className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="size-4" /> Card rated. Move to the next one.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={reveal}
            disabled={disabled || shown}
          >
            <Eye className="mr-2 size-4" /> Reveal answer
          </Button>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(({ rating, label, className }) => (
              <Button
                key={rating}
                disabled={disabled || !shown}
                onClick={() => {
                  const ms = revealedAt[current.senseId]
                    ? Date.now() - revealedAt[current.senseId]
                    : undefined;
                  void rate(rating, ms);
                }}
                className={shown ? className : ""}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {localError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="size-4" /> {localError}
        </p>
      ) : null}
    </div>
  );
}