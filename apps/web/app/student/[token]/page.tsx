"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type ActivityListItem, type StudentAssignment } from "@/lib/api";
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
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { LearnerShell } from "@/components/learner-shell";
import { LearningStatusBadge } from "@/components/students/status-badge";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { StatusBadge as ActivityStatusBadge } from "@/components/activities/status-badges";
import { ActivityTypeBadge } from "@/components/activities/activity-type-badge";
import { Skeleton } from "@/components/ui/skeleton";

function dueLabel(nextReviewAt: string | null): string {
  if (!nextReviewAt) return "any time";
  const diff = new Date(nextReviewAt).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

function firstNameOf(name: string): string {
  return name.trim();
}

function practiceHref(
  token: string,
  activities: ActivityListItem[] | undefined,
  assignments: StudentAssignment[] | undefined,
): string | null {
  const playable = activities?.find((row) => row.status === "ACTIVE");
  if (playable) return `/student/${token}/activities/${playable.id}`;
  const firstActivity = activities?.[0];
  if (firstActivity) return `/student/${token}/activities/${firstActivity.id}`;
  const firstAssignment = assignments?.[0];
  if (firstAssignment) return `/student/${token}/assignments/${firstAssignment.id}`;
  return null;
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

  const { data: due, isLoading: dueLoading, isError: dueError } = useQuery({
    queryKey: ["student-access-due", token],
    queryFn: () => api.accessDueReviews(token!, { limit: 20 }),
    enabled: !!token && !!access,
    retry: false,
  });

  const { data: words, isLoading: wordsLoading, isError: wordsError } = useQuery({
    queryKey: ["student-access-words", token],
    queryFn: () => api.accessVocabulary(token!, { limit: 20 }),
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
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Opening your learning space…
            </p>
          </CardContent>
        </Card>
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
          <CardContent className="text-center text-sm text-muted-foreground">
            Ask your teacher for a new access link.
          </CardContent>
        </Card>
      </CenteredShell>
    );
  }

  const s = summary;
  const firstName = firstNameOf(access.student.firstName);
  const continueHref = practiceHref(token!, activities, assignments);

  return (
    <LearnerShell eyebrow="Student dashboard" accessToken={token}>
      <section className="overflow-hidden rounded-3xl bg-sidebar p-6 text-sidebar-foreground shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <GraduationCap className="size-6 text-amber-200" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
                Your space
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {access.student.displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-sidebar-foreground/75">
                Welcome back, {firstName}. Review due words and open the
                practice your teacher assigned.
              </p>
            </div>
          </div>
          {continueHref ? (
            <Button asChild size="lg" className="w-fit shrink-0">
              <Link href={continueHref}>
                <Sparkles className="size-4" />
                Continue practice
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Assigned"
            value={s.assigned}
            hint={`${s.learning} in learning`}
            tone="text-sky-700"
            wash="bg-sky-50"
          />
          <StatCard
            label="Reviewing"
            value={s.reviewing}
            hint="Scheduled reviews"
            tone="text-violet-700"
            wash="bg-violet-50"
          />
          <StatCard
            label="Mastered"
            value={s.mastered}
            hint="Long-term memory"
            tone="text-emerald-700"
            wash="bg-emerald-50"
          />
          <StatCard
            label="Due now"
            value={s.dueNow}
            hint="Ready to practice"
            tone="text-amber-700"
            wash="bg-amber-50"
          />
        </div>
      ) : summaryLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
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
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : dueError ? (
              <p className="py-8 text-center text-sm text-destructive">
                Could not load due words right now.
              </p>
            ) : !due || due.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing is due right now. Come back later for your next review.
              </p>
            ) : (
              due.data.map((row) => (
                <div
                  key={row.state.senseId}
                  className="flex flex-col gap-2 rounded-xl border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {row.sense.lemma}
                      <span className="text-xs font-normal text-muted-foreground">
                        {row.sense.partOfSpeech}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground wrap-break-word">
                      {row.sense.definition}
                    </p>
                    {row.sense.translations.length > 0 ? (
                      <p className="mt-1 text-sm leading-relaxed text-primary wrap-break-word">
                        {row.sense.translations.map((t) => t.text).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LearningStatusBadge status={row.state.status} />
                    <span className="text-xs whitespace-nowrap text-amber-600">
                      {dueLabel(row.state.nextReviewAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hourglass className="size-5 text-sky-600" />
              Your words
              {words ? (
                <span className="text-sm font-normal text-muted-foreground">
                  {words.meta.total} words
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wordsLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : wordsError ? (
              <p className="py-8 text-center text-sm text-destructive">
                Could not load your words.
              </p>
            ) : !words || words.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Your teacher has not assigned words yet.
              </p>
            ) : (
              words.data.map((row) => (
                <div
                  key={row.state.senseId}
                  className="flex flex-col gap-2 rounded-xl border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {row.sense.lemma}
                      <span className="text-xs font-normal text-muted-foreground">
                        {row.sense.partOfSpeech}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground wrap-break-word">
                      {row.sense.definition}
                    </p>
                    {row.sense.translations.length > 0 ? (
                      <p className="mt-1 text-sm leading-relaxed text-primary wrap-break-word">
                        {row.sense.translations.map((t) => t.text).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <LearningStatusBadge status={row.state.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
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
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : !assignments || assignments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No homework assignments yet. Words your teacher added appear
                under Your words. Practice starts when your teacher creates an
                activity.
              </p>
            ) : (
              assignments.map((row) => (
                <Link
                  key={row.id}
                  href={`/student/${token}/assignments/${row.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-background px-3 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {row.title}
                      <AssignmentStatusBadge status={row.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, row.progress)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {(row.learningCount ?? 0) > 0
                          ? `${row.learningCount} in learning · ${row.masteredCount}/${row.itemCount} mastered`
                          : `${row.masteredCount}/${row.itemCount} mastered`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.dueAt
                        ? `Due ${new Date(row.dueAt).toLocaleDateString()}`
                        : row.masteredCount === 0 && (row.learningCount ?? 0) > 0
                          ? "Activity practice starts learning — mastery takes several reviews."
                          : `${row.progress}% mastered`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
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
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : !activities || activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You don&apos;t have any activities yet. Your teacher will add
                practice exercises for you here.
              </p>
            ) : (
              activities.map((row) => (
                <Link
                  key={row.id}
                  href={`/student/${token}/activities/${row.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-background px-3 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {row.title}
                      <ActivityStatusBadge status={row.status} />
                      <ActivityTypeBadge type={row.activityType} />
                    </div>
                    {row.latestSession ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
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
                          {row.latestSession.percentComplete}% ·{" "}
                          {row.latestSession.status.toLowerCase()}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.itemCount} items · not started
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center justify-center gap-2 pb-4 text-center text-xs text-muted-foreground">
        <BookOpenCheck className="size-4" />
        Keep reviewing every day to move words into long-term memory.
      </p>
    </LearnerShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  wash,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: string;
  wash?: string;
}) {
  return (
    <Card className={wash}>
      <CardContent className="py-5">
        <div className={`text-3xl font-semibold tabular-nums ${tone ?? ""}`}>
          {value}
        </div>
        <div className="mt-1 text-sm font-medium">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      {children}
    </div>
  );
}
