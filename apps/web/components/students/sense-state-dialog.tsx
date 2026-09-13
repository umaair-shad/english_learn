"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, RotateCcw, Target } from "lucide-react";
import { api, type ReviewHistoryRow, type StudentVocabState } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LearningStatusBadge } from "./status-badge";

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function SenseStateDialog({
  studentId,
  senseId,
  onOpenChange,
}: {
  studentId: number;
  senseId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["student-vocab-sense", studentId, senseId],
    queryFn: () => api.studentVocabDetail(studentId, senseId as number),
    enabled: senseId !== null,
  });

  const overrideMutation = useMutation({
    mutationFn: (payload: { status: import("@/lib/api").LearningStatus; forceDue?: boolean }) =>
      api.studentOverrideState(studentId, senseId as number, payload.status, payload.forceDue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-vocab-sense", studentId, senseId] });
      queryClient.invalidateQueries({ queryKey: ["student-vocabulary", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-vocab-summary", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-due-reviews", studentId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => api.studentUnassignSense(studentId, senseId as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-vocabulary", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-vocab-summary", studentId] });
      onOpenChange(false);
    },
  });

  const state = data?.state as StudentVocabState | undefined;

  return (
    <Dialog
      open={senseId !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="h-[96dvh] sm:h-[min(92dvh,72rem)]">
        {isLoading || (!data && senseId !== null) ? (
          <>
          <DialogHeader>
            <DialogTitle>Sense #{senseId}</DialogTitle>
            <DialogDescription>Loading learning state…</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </DialogBody>
          </>
        ) : isError || !data ? (
          <>
          <DialogHeader>
            <DialogTitle>Sense #{senseId}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Could not load this sense.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => void refetch()}>
              Retry
            </Button>
          </DialogBody>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {data.sense.lemma}
                <Badge variant="secondary" className="ml-2 align-middle">
                  {data.sense.partOfSpeech}
                </Badge>
                {state ? (
                  <span className="ml-2 align-middle">
                    <LearningStatusBadge status={state.status} />
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription>
                sense #{data.sense.id} · entry #{data.sense.entryId}
                {state?.isDue ? " · due now" : ""}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
            {state ? (
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Next review" value={fmtDate(state.nextReviewAt)} />
                  <Stat label="Reviews" value={String(state.reviewCount)} />
                  <Stat label="Correct / wrong" value={`${state.correctCount} / ${state.incorrectCount}`} />
                  <Stat label="Retrievability" value={state.retrievability === null ? "—" : `${Math.round(state.retrievability * 100)}%`} />
                  <Stat label="Stability (days)" value={state.stability === null ? "—" : state.stability.toFixed(1)} />
                  <Stat label="Difficulty" value={state.difficulty === null ? "—" : state.difficulty.toFixed(1)} />
                  <Stat label="First learned" value={fmtDate(state.firstLearnedAt)} />
                  <Stat label="Last reviewed" value={fmtDate(state.lastReviewedAt)} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate({ status: "MASTERED" })}
                  >
                    <Target className="mr-2 size-4" />
                    Mark known
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate({ status: "ASSIGNED" })}
                  >
                    Mark unknown
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate({ status: "LEARNING" })}
                  >
                    Force learning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate({ status: "REVIEWING", forceDue: true })}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Force review
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate()}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Definition
              </h3>
              <p className="mt-1 text-sm">{data.sense.definition}</p>
              {data.sense.translations.length > 0 ? (
                <p className="mt-2 text-sm">
                  <span className="text-xs text-muted-foreground">Polish: </span>
                  {data.sense.translations.map((t) => t.text).join(", ")}
                </p>
              ) : null}
              {data.sense.cefrLevels.length > 0 ? (
                <div className="mt-2 flex gap-1">
                  {data.sense.cefrLevels.map((l) => (
                    <Badge key={l} variant="outline">
                      {l}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Recent reviews ({data.recentReviews.length})
              </h3>
              {data.recentReviews.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No reviews recorded yet.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {data.recentReviews.map((r) => (
                    <HistoryRow key={r.id} r={r} />
                  ))}
                </div>
              )}
            </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryRow({ r }: { r: ReviewHistoryRow }) {
  return (
    <div className="rounded-md border px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={r.rating === null ? "secondary" : "outline"}>
          {r.rating ?? r.sourceType}
        </Badge>
        <span className="font-medium">
          {r.previousStatus} → {r.newStatus}
        </span>
        <span className="ml-auto text-muted-foreground">
          <CalendarClock className="mr-1 inline size-3" />
          {new Date(r.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="mt-1 text-muted-foreground">
        stability {r.previousStability?.toFixed(1) ?? "—"} → {r.newStability?.toFixed(1) ?? "—"} · next
        review {fmtDate(r.previousNextReviewAt)} → {fmtDate(r.nextReviewAt)}
      </div>
    </div>
  );
}