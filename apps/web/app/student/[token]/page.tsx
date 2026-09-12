"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BellRing,
  GraduationCap,
  Loader2,
  AlertCircle,
  BookOpenCheck,
  Hourglass,
  ClipboardList,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { LearningStatusBadge } from "@/components/students/status-badge";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { StatusBadge as ActivityStatusBadge } from "@/components/activities/status-badges";
import { Skeleton } from "@/components/ui/skeleton";

function dueLabel(nextReviewAt: string | null): string {
  if (!nextReviewAt) return "any time";
  const diff = new Date(nextReviewAt).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function StudentViewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: access, isLoading: validating, error: accessError } = useQuery({
    queryKey: ["student-access", token],
    queryFn: () => api.resolveAccessToken(token!),
    enabled: !!token,
    retry: false,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["student-access-summary", token],
    queryFn: () => api.accessSummary(token!),
    enabled: !!token && !!access,
    retry: false,
  });

  const { data: due, isLoading: dueLoading } = useQuery({
    queryKey: ["student-access-due", token],
    queryFn: () => api.accessDueReviews(token!, { limit: 10 }),
    enabled: !!token && !!access,
    retry: false,
  });

  const { data: learning, isLoading: learningLoading } = useQuery({
    queryKey: ["student-access-learning", token],
    queryFn: () => api.accessVocabulary(token!, { status: "LEARNING", limit: 3 }),
    enabled: !!token && !!access,
    retry: false,
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["student-access-assignments", token],
    queryFn: () => api.accessAssignments(token!),
    enabled: !!token && !!access,
    retry: false,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["student-access-activities", token],
    queryFn: () => api.accessActivities(token!),
    enabled: !!token && !!access,
    retry: false,
  });

  if (validating) {
    return (
      <CenteredShell>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Validating access token...
        </p>
      </CenteredShell>
    );
  }

  if (accessError || !access) {
    return (
      <CenteredShell>
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center text-center">
            <AlertCircle className="mb-2 size-10 text-destructive" />
            <CardTitle className="text-xl">Invalid Link</CardTitle>
            <CardDescription>
              This access token is invalid, expired, or has been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <p>
              Ask your teacher for a new access link, or contact support if you
              believe this is an error.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher">Teacher CMS</Link>
            </Button>
          </CardContent>
        </Card>
      </CenteredShell>
    );
  }

  const s = summary;

  return (
    <div className="min-h-svh bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader className="flex flex-col items-center text-center">
            <GraduationCap className="mb-2 size-10 text-primary" />
            <CardTitle className="text-xl">{access.student.displayName}</CardTitle>
            <CardDescription>
              Welcome, {access.student.firstName}! Your vocabulary learning
              space is below.
            </CardDescription>
          </CardHeader>
        </Card>

        {s ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Learning" value={s.learning} />
            <StatCard label="Reviewing" value={s.reviewing} />
            <StatCard label="Mastered" value={s.mastered} />
            <StatCard label="Due now" value={s.dueNow} tone="text-amber-600" />
          </div>
        ) : summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-5 text-amber-600" />
              Due now
              {due ? (
                <span className="text-sm font-normal text-muted-foreground">
                  {due.meta.total} items
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !due || due.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing is due right now. Come back later for your next review.
              </p>
            ) : (
              due.data.map((row) => (
                <div
                  key={row.state.senseId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.sense.lemma}
                      <span className="text-xs text-muted-foreground">
                        {row.sense.partOfSpeech}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.sense.definition}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LearningStatusBadge status={row.state.status} />
                    <span className="text-xs text-amber-600 whitespace-nowrap">
                      {dueLabel(row.state.nextReviewAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hourglass className="size-5 text-sky-600" />
              In learning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {learningLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !learning || learning.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You don&apos;t have words being learned yet. Your teacher
                assigns vocabulary from the class.
              </p>
            ) : (
              learning.data.map((row) => (
                <div
                  key={row.state.senseId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.sense.lemma}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.sense.translations.length > 0
                        ? row.sense.translations.map((t) => t.text).join(", ")
                        : row.sense.definition}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <LearningStatusBadge status={row.state.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-5 text-emerald-600" />
              Your assignments
              {assignments ? (
                <span className="text-sm font-normal text-muted-foreground">
                  {assignments.length}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignmentsLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !assignments || assignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You don&apos;t have any assignments yet. Your teacher will add
                vocabulary for you here.
              </p>
            ) : (
              assignments.map((row) => (
                <Link
                  key={row.id}
                  href={`/student/${token}/assignments/${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.title}
                      <AssignmentStatusBadge status={row.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, row.progress)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {row.masteredCount}/{row.itemCount} mastered
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {row.dueAt
                      ? `Due ${new Date(row.dueAt).toLocaleDateString()}`
                      : `${row.progress}%`}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gamepad2 className="size-5 text-violet-600" />
              Your activities
              {activities ? (
                <span className="text-sm font-normal text-muted-foreground">
                  {activities.length}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activitiesLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !activities || activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You don&apos;t have any activities yet. Your teacher will add
                practice exercises for you here.
              </p>
            ) : (
              activities.map((row) => (
                <Link
                  key={row.id}
                  href={`/student/${token}/activities/${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.title}
                      <ActivityStatusBadge status={row.status} />
                      <span className="text-xs text-muted-foreground">
                        {row.activityType}
                      </span>
                    </div>
                    {row.latestSession ? (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${Math.min(
                                100,
                                row.latestSession.percentComplete,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {row.latestSession.percentComplete}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {row.itemCount} items
                      </p>
                    )}
                  </div>
                  {row.latestSession ? (
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {row.latestSession.status}
                    </span>
                  ) : null}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <BookOpenCheck className="size-4" />
          Keep reviewing every day to move words into long-term memory.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className={`text-2xl font-semibold tabular-nums ${tone ?? ""}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
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