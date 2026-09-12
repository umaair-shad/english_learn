"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActivityItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GameplayProps, shuffle } from "./gameplay-types";

interface Prompt {
  target: string;
  /** Cloze sentence with the target blanked out, when a real example exists. */
  sentence: string | null;
  /** Fallback context (translations + definition) when no suitable example. */
  contextLines: string[];
}

function buildPrompt(item: ActivityItem): Prompt {
  const target = item.lemma;
  const lower = target.toLowerCase();
  const example = item.examples.find((ex) => ex.toLowerCase().includes(lower));
  if (example) {
    const idx = example.toLowerCase().indexOf(lower);
    const sentence =
      example.slice(0, idx) + "_____" + example.slice(idx + target.length);
    return { target, sentence, contextLines: [] };
  }
  const lines: string[] = [];
  if (item.translations.length > 0) {
    lines.push(`Polish: ${item.translations.map((t) => t.text).join(", ")}`);
  }
  if (item.definition) lines.push(item.definition);
  return { target, sentence: null, contextLines: lines };
}

function isCorrectAnswer(input: string, item: ActivityItem): boolean {
  const a = input.trim().toLowerCase().replace(/\s+/g, " ");
  const lemma = item.lemma.trim().toLowerCase().replace(/\s+/g, " ");
  const norm = item.normalizedLemma.trim().toLowerCase().replace(/\s+/g, " ");
  return a === lemma || a === norm;
}

export function FillBlankGameplay({ items, paused, busy, submit, onComplete }: GameplayProps) {
  const queue = useState(() => shuffle(items))[0];
  const prompts = useState(() => Object.fromEntries(queue.map((i) => [i.senseId, buildPrompt(i)])))[0];
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [localError, setLocalError] = useState<string | null>(null);

  const total = queue.length;
  const item = queue[index];
  const prompt = prompts[item.senseId];
  const disabled = paused || busy;

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This activity has no blanks.
      </p>
    );
  }

  async function submitAnswer() {
    if (disabled || submitted) return;
    const answer = value.trim();
    if (!answer) return;
    const correct = isCorrectAnswer(answer, item);
    const responseTimeMs = Date.now() - startedAt;
    const events = correct
      ? [
          {
            eventType: "ANSWER_SUBMITTED" as const,
            vocabularySenseId: item.senseId,
            response: answer,
            responseTimeMs,
          },
          {
            eventType: "ANSWER_CORRECT" as const,
            vocabularySenseId: item.senseId,
            rating: "GOOD" as const,
            response: answer,
            responseTimeMs,
          },
        ]
      : [
          {
            eventType: "ANSWER_SUBMITTED" as const,
            vocabularySenseId: item.senseId,
            response: answer,
            responseTimeMs,
          },
          {
            eventType: "ANSWER_INCORRECT" as const,
            vocabularySenseId: item.senseId,
            rating: "AGAIN" as const,
            response: answer,
            responseTimeMs,
          },
        ];
    const ok = await submit(events);
    if (!ok) {
      setLocalError("Could not save your answer. Please try again.");
      return;
    }
    setLocalError(null);
    setSubmitted(true);
    setLastCorrect(correct);
    setAnswered((n) => n + 1);
  }

  function next() {
    if (disabled) return;
    if (index + 1 >= total) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setValue("");
    setSubmitted(false);
    setLastCorrect(false);
    setStartedAt(Date.now());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Blank {index + 1} of {total}
        </span>
        <span>{answered} completed</span>
      </div>

      <div className="space-y-2 rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {item.partOfSpeech || "word"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Type the missing word. Spelling and capitalisation are ignored.
          </span>
        </div>

        {prompt.sentence ? (
          <p className="text-lg leading-relaxed">
            {prompt.sentence.split("_____")[0]}
            <span className="rounded bg-muted px-1 font-semibold text-primary">
              _____
            </span>
            {prompt.sentence.split("_____").slice(1).join("_____")}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Type the English word that fits this clue:
            </p>
            {prompt.contextLines.map((line, i) => (
              <p key={i} className="text-sm">
                {line}
              </p>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitAnswer();
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || submitted}
            placeholder="Type your answer…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
          {submitted ? (
            <Button onClick={next} disabled={disabled} type="button" className="mt-3">
              {index + 1 >= total ? "See results" : "Next blank"}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={disabled || !value.trim()}
              className="mt-3"
            >
              Check answer
            </Button>
          )}
        </form>
      </div>

      {submitted ? (
        <div
          className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
            lastCorrect
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {lastCorrect ? (
            <>
              <CheckCircle2 className="size-4" /> Correct!
            </>
          ) : (
            <>
              <AlertCircle className="size-4" />
              <span>
                Not quite — the answer is <strong>{prompt.target}</strong>.
              </span>
            </>
          )}
        </div>
      ) : null}

      {localError ? (
        <p className="text-sm text-destructive">{localError}</p>
      ) : null}
    </div>
  );
}