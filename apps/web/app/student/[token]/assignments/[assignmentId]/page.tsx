"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { LearningStatusBadge } from "@/components/students/status-badge";

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ token: string; assignmentId: string }>();
  const token = params.token;
  const assignmentId = Number(params.assignmentId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["student-access-assignment", token, assignmentId],
    queryFn: () => api.accessAssignment(token!, assignmentId),
    enabled: !!token && !isNaN(assignmentId),
    retry: false,
  });

  if (isLoading) {
    return (
      <CenteredShell>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading assignment...</p>
      </CenteredShell>
    );
  }

  if (isError || !data) {
    return (
      <CenteredShell>
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center text-center">
            <AlertCircle className="mb-2 size-10 text-destructive" />
            <CardTitle className="text-xl">Assignment unavailable</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <p>
              This assignment doesn&apos;t exist or isn&apos;t available with
              your link. Ask your teacher for help.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </CenteredShell>
    );
  }

  return (
    <div className="min-h-svh bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href={`/student/${token}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to my space
          </Link>
        </Button>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{data.title}</CardTitle>
              <AssignmentStatusBadge status={data.status} />
            </div>
            {data.description ? (
              <p className="text-sm text-muted-foreground">
                {data.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {data.dueAt ? (
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-4" />
                  Due {new Date(data.dueAt).toLocaleDateString()}
                </span>
              ) : null}
              <span>
                {data.progress.mastered} of {data.progress.total} words mastered
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, data.progress.percent)}%` }}
                />
              </div>
              <span className="text-sm tabular-nums font-medium">
                {data.progress.percent}%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {(
                [
                  ["assigned", "assigned"],
                  ["encountered", "encountered"],
                  ["learning", "in learning"],
                  ["reviewing", "reviewing"],
                  ["mastered", "mastered"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-md border px-1 py-2">
                  <div className="text-sm font-semibold tabular-nums">
                    {data.progress.countByStatus[key]}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-5 text-sky-600" />
              Words in this assignment
              <span className="text-sm font-normal text-muted-foreground">
                {data.items.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.items.map((item) => (
              <div
                key={item.senseId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {item.lemma}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.partOfSpeech}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.translations.length > 0
                      ? item.translations.map((t) => t.text).join(", ")
                      : item.definition}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.learning ? (
                    <LearningStatusBadge status={item.learning} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}