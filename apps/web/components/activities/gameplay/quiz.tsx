"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActivityItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameplayProps, shuffle } from "./gameplay-types";

interface Option {
  senseId: number;
  text: string;
}

function answerText(item: ActivityItem): string {
  return item.translations.length > 0 ? item.translations[0].text : item.definition || item.lemma;
}

function buildQuestions(items: ActivityItem[]): ActivityItem[] {
  return shuffle(items);
}

function buildOptions(items: ActivityItem[]): Option[] {
  const pool = items.map((item) => ({
    senseId: item.senseId,
    text: answerText(item),
  }));
  const seen = new Set<string>();
  const unique = pool.filter((o) => {
    const text = o.text.trim().toLowerCase();
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  return shuffle(unique);
}

export function QuizGameplay({ items, paused, busy, submit, onComplete }: GameplayProps) {
  const queue = useState(() => buildQuestions(items))[0];
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [localError, setLocalError] = useState<string | null>(null);

  const total = queue.length;
  const question = queue[index];
  const options = useMemo(() => buildOptions(queue), [queue]);
  const disabled = paused || busy;

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        This activity has no questions.
      </p>
    );
  }

  const correctOption = options.find((o) => o.senseId === question.senseId) ?? null;
  const correctText = correctOption?.text ?? answerText(question);

  async function submitAnswer() {
    if (disabled || submitted || chosen === null) return;
    const chosenOption = options.find((o) => o.senseId === chosen);
    const isCorrect = chosenOption?.senseId === question.senseId;
    const responseTimeMs = Date.now() - questionStart;
    const response = chosenOption?.text ?? "";
    const events = isCorrect
      ? [
          {
            eventType: "ANSWER_SUBMITTED" as const,
            vocabularySenseId: question.senseId,
            direction: "en->pl",
            response,
            responseTimeMs,
            metadata: {
              liveState: {
                kind: "quiz",
                question: question.lemma,
                options: options.map((o) => o.text),
                selected: response,
                correct: true,
                score: score + 1,
                index: index + 1,
                total,
              },
            },
          },
          {
            eventType: "ANSWER_CORRECT" as const,
            vocabularySenseId: question.senseId,
            rating: "GOOD" as const,
            response,
            responseTimeMs,
          },
        ]
      : [
          {
            eventType: "ANSWER_SUBMITTED" as const,
            vocabularySenseId: question.senseId,
            direction: "en->pl",
            response,
            responseTimeMs,
            metadata: {
              liveState: {
                kind: "quiz",
                question: question.lemma,
                options: options.map((o) => o.text),
                selected: response,
                correct: false,
                score,
                index: index + 1,
                total,
              },
            },
          },
          {
            eventType: "ANSWER_INCORRECT" as const,
            vocabularySenseId: question.senseId,
            rating: "AGAIN" as const,
            response,
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
    setLastCorrect(isCorrect);
    if (isCorrect) setScore((s) => s + 1);
  }

  function next() {
    if (disabled) return;
    if (index + 1 >= total) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    setSubmitted(false);
    setLastCorrect(false);
    setQuestionStart(Date.now());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>Score: {score}</span>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-semibold">{question.lemma}</span>
          <Badge variant="outline" className="text-xs">
            {question.partOfSpeech || "—"}
          </Badge>
        </div>
        {question.definition ? (
          <p className="text-sm text-muted-foreground">{question.definition}</p>
        ) : null}
        <p className="text-sm">Choose the Polish word:</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isChosen = chosen === option.senseId;
          const isCorrectOption = option.senseId === question.senseId;
          let className = "justify-between";
          if (submitted) {
            if (isCorrectOption) className += " border-emerald-300 bg-emerald-50";
            else if (isChosen && !lastCorrect) className += " border-red-300 bg-red-50";
            else className += " opacity-60";
          } else if (isChosen) {
            className += " border-primary bg-accent";
          }
          return (
            <Button
              key={option.senseId}
              variant="outline"
              className={className}
              disabled={disabled || submitted}
              onClick={() => setChosen(option.senseId)}
            >
              {option.text}
              {submitted && isCorrectOption ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : submitted && isChosen && !lastCorrect ? (
                <AlertCircle className="size-4 text-red-600" />
              ) : null}
            </Button>
          );
        })}
      </div>

      {submitted ? (
        <div
          className={`rounded-md border p-3 text-sm ${
            lastCorrect
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {lastCorrect ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Correct!
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <AlertCircle className="size-4" /> Incorrect — the answer is{" "}
              <strong>{correctText}</strong>.
            </span>
          )}
        </div>
      ) : null}

      {localError ? (
        <p className="text-sm text-destructive">{localError}</p>
      ) : null}

      {submitted ? (
        <Button onClick={next} disabled={disabled} className="w-full sm:w-auto">
          {index + 1 >= total ? "See results" : "Next question"}
        </Button>
      ) : (
        <Button onClick={submitAnswer} disabled={disabled || chosen === null} className="w-full sm:w-auto">
          Submit answer
        </Button>
      )}
    </div>
  );
}