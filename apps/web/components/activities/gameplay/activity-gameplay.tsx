"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { ActivityTypeBadge } from "@/components/activities/activity-type-badge";
import { StatusBadge } from "@/components/activities/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityRuntime } from "./use-activity-runtime";
import { FlashcardsGameplay } from "./flashcards";
import { MemoryGameplay } from "./memory";
import { QuizGameplay } from "./quiz";
import { FillBlankGameplay } from "./fillblank";

export function ActivityGameplay({
  token,
  activityId,
  mode = "student",
}: {
  token: string;
  activityId: number;
  mode?: "student" | "play";
}) {
  const runtime = useActivityRuntime(token, activityId, mode);

  if (runtime.activityLoading && !runtime.activity) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!runtime.activity) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">
            {runtime.activityError ??
              "This activity is not available to you."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activity = runtime.activity;
  const session = runtime.session;
  const progress = session
    ? session.percentComplete
    : runtime.latestSession?.percentComplete ?? 0;
  const paused = session?.status === "PAUSED";

  const complete = () => {
    if (runtime.session?.status === "ACTIVE") void runtime.finish();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              {activity.title}
              <ActivityTypeBadge type={activity.activityType} />
            </CardTitle>
            <CardDescription className="mt-1">
              {activity.description ?? "No description provided by your teacher."}
            </CardDescription>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{activity.itemCount} items</span>
              {activity.assignment ? (
                <span>From assignment: {activity.assignment.title}</span>
              ) : null}
              {session ? <StatusBadge status={session.status} /> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>

          {runtime.error ? (
            <p className="text-sm text-destructive">{runtime.error}</p>
          ) : null}
        </CardContent>
      </Card>

      {runtime.phase === "idle" ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {runtime.latestSession ? (
              <p className="text-sm text-muted-foreground">
                Your last session reached {runtime.latestSession.percentComplete}%.
                Starting again will open a fresh session.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {activity.activityType === "FLASHCARDS"
                  ? "Review flashcards, reveal each answer, then rate how well you knew it."
                  : activity.activityType === "MEMORY"
                    ? "Match each English word to its Polish translation."
                    : activity.activityType === "QUIZ"
                      ? "Choose the correct Polish word for each English word."
                      : "Type the missing word in each example sentence."}
              </p>
            )}
            <Button
              size="lg"
              onClick={() => void runtime.start()}
              disabled={runtime.busy}
            >
              {runtime.busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              Start activity
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {runtime.phase === "playing" ? (
        <>
          {paused ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <p className="text-sm font-medium text-amber-800">
                  Session paused — your progress is saved.
                </p>
                <Button size="sm" onClick={() => void runtime.resume()} disabled={runtime.busy}>
                  {runtime.busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 size-4" />
                  )}
                  Resume
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-6">
              {activity.activityType === "FLASHCARDS" ? (
                <FlashcardsGameplay
                  items={activity.items}
                  paused={paused}
                  busy={runtime.busy}
                  settings={activity.settings}
                  submit={runtime.submitEvents}
                  onComplete={complete}
                />
              ) : activity.activityType === "MEMORY" ? (
                <MemoryGameplay
                  items={activity.items}
                  paused={paused}
                  busy={runtime.busy}
                  settings={activity.settings}
                  submit={runtime.submitEvents}
                  onComplete={complete}
                />
              ) : activity.activityType === "QUIZ" ? (
                <QuizGameplay
                  items={activity.items}
                  paused={paused}
                  busy={runtime.busy}
                  settings={activity.settings}
                  submit={runtime.submitEvents}
                  onComplete={complete}
                />
              ) : (
                <FillBlankGameplay
                  items={activity.items}
                  paused={paused}
                  busy={runtime.busy}
                  settings={activity.settings}
                  submit={runtime.submitEvents}
                  onComplete={complete}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {session && !paused ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runtime.pause()}
                disabled={runtime.busy}
              >
                {runtime.busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 size-4" />
                )}
                Pause
              </Button>
            ) : null}
            {session ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runtime.finish()}
                disabled={runtime.busy}
              >
                {runtime.busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Square className="mr-2 size-4" />
                )}
                Finish
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {runtime.phase === "finished" && session ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Activity complete
            </CardTitle>
            <CardDescription>
              Your results have been saved to your learning profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Answered" value={session.completedCount} />
              <Metric
                label="Correct"
                value={session.correctCount}
                tone="text-emerald-600"
              />
              <Metric
                label="Incorrect"
                value={session.incorrectCount}
                tone="text-red-600"
              />
              <Metric label="Progress" value={`${session.percentComplete}%`} />
            </div>
            <Button onClick={() => void runtime.start()} disabled={runtime.busy}>
              {runtime.busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 size-4" />
              )}
              Practice again
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-md border px-3 py-2 text-center">
      <div className={`text-lg font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}