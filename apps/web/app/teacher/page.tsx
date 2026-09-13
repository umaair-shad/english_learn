"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  ChartColumn,
  CloudUpload,
  ClipboardList,
  ServerCrash,
  Users,
} from "lucide-react";
import { api, type DashboardRecentSession } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "cn";

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-sky-500",
  ENCOUNTERED: "bg-amber-400",
  LEARNING: "bg-blue-500",
  REVIEWING: "bg-violet-500",
  MASTERED: "bg-emerald-500",
};

function StatCard({
  icon: Icon,
  title,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  title: string;
  value: string | number;
  hint?: string;
  tone: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className={cn("rounded-lg p-1.5", tone)}>
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function TrendBars({
  points,
}: {
  points: { date: string; reviews: number }[];
}) {
  const max = Math.max(...points.map((p) => p.reviews), 1);
  return (
    <div className="flex h-24 items-end gap-1">
      {points.map((p) => (
        <div
          key={p.date}
          className="flex h-full flex-1 flex-col justify-end"
          title={`${p.date}: ${p.reviews} reviews`}
        >
          <div
            className={cn(
              "w-full rounded-t",
              p.reviews > 0 ? "bg-primary/80" : "bg-muted",
            )}
            style={{
              height: `${Math.max((p.reviews / max) * 100, p.reviews > 0 ? 6 : 2)}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function RecentSessions({ sessions }: { sessions: DashboardRecentSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sessions yet. Students see their assigned activities on their
        private dashboard.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {sessions.slice(0, 5).map((s) => (
        <li key={s.sessionId} className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate">
            <span className="font-medium">{s.studentDisplayName}</span>
            <span className="text-muted-foreground"> · {s.activityTitle}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">{s.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {s.progress}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TeacherDashboardPage() {
  const dashboard = useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: () => api.dashboardReports(),
    refetchInterval: 60_000,
  });

  const { data, isLoading, isError, refetch } = dashboard;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">Dashboard</h1>
        <p className="app-page-lead">
          Live summary of your students, assignments and activities.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <ServerCrash className="size-6 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">Cannot reach the API</p>
              <p className="text-sm text-muted-foreground">
                Verifiy Postgres and the API service are running, then retry.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Users}
              title="Students"
              value={data.students.total}
              hint={`${data.students.active} active`}
              tone="bg-sky-100 text-sky-700"
            />
            <StatCard
              icon={ClipboardList}
              title="Assignments"
              value={data.assignments.total}
              hint={
                data.assignments.overdue > 0
                  ? `${data.assignments.active} active · ${data.assignments.overdue} overdue`
                  : `${data.assignments.active} active`
              }
              tone="bg-amber-100 text-amber-700"
            />
            <StatCard
              icon={Activity}
              title="Activities"
              value={data.activities.total}
              hint={`${data.activities.active} active`}
              tone="bg-violet-100 text-violet-700"
            />
            <StatCard
              icon={BookOpen}
              title="Vocabulary senses"
              value={data.vocabulary.catalogSenses.toLocaleString()}
              hint="Sense-level rows in the catalog"
              tone="bg-emerald-100 text-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learning progress</CardTitle>
                <CardDescription>
                  Status of assigned senses across your students.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  {Object.entries(STATUS_COLORS).map(([status, color]) =>
                    data.learning[status.toLowerCase() as keyof typeof data.learning] > 0 ? (
                      <div
                        key={status}
                        className={color}
                        style={{
                          width: `${(data.learning[status.toLowerCase() as keyof typeof data.learning] /
                            data.learning.totalAssignedSenses) *
                            100}%`,
                        }}
                        title={status}
                      />
                    ) : null,
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <span key={status} className="flex items-center gap-1">
                      <span className={cn("size-2 rounded-full", color)} />
                      {status[0] + status.slice(1).toLowerCase()}{" "}
                      {data.learning[status.toLowerCase() as keyof typeof data.learning]}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="destructive">
                    Due now: {data.learning.dueNow}
                  </Badge>
                  <Badge variant="secondary">
                    Reviews done: {data.learning.reviewsDone}
                  </Badge>
                  <Badge variant="secondary">
                    Assigned senses: {data.learning.totalAssignedSenses}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review trend</CardTitle>
                <CardDescription>Reviews per day (last 14 days).</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendBars points={data.reviewTrend} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Most recent sessions across your students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentSessions sessions={data.recentSessions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Dive into the analytics and data tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/teacher/reports">
                  <ChartColumn className="size-4" />
                  View reports
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/teacher/import-export">
                  <CloudUpload className="size-4" />
                  Import / Export
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}