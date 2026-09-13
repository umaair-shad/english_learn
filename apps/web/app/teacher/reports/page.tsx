"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ReportActivity } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-sky-500",
  ENCOUNTERED: "bg-amber-400",
  LEARNING: "bg-blue-500",
  REVIEWING: "bg-violet-500",
  MASTERED: "bg-emerald-500",
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  ENCOUNTERED: "Encountered",
  LEARNING: "Learning",
  REVIEWING: "Reviewing",
  MASTERED: "Mastered",
};

function StatusBar({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />;
  }
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {Object.entries(STATUS_COLORS).map(([status, color]) =>
        counts[status] > 0 ? (
          <div
            key={status}
            className={color}
            style={{ width: `${(counts[status] / total) * 100}%` }}
            title={`${STATUS_LABELS[status]}: ${counts[status]}`}
          />
        ) : null,
      )}
    </div>
  );
}

function TrendBars({
  points,
}: {
  points: { date: string; reviews: number; correct: number; incorrect: number }[];
}) {
  const max = Math.max(...points.map((p) => p.reviews), 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {points.map((p) => (
        <div
          key={p.date}
          className="group relative flex h-full flex-1 flex-col justify-end"
        >
          <div
            className="w-full rounded-t bg-primary/80"
            style={{
              height: `${Math.max((p.reviews / max) * 100, p.reviews > 0 ? 4 : 0)}%`,
            }}
            title={`${p.date}: ${p.reviews} reviews (${p.correct} correct, ${p.incorrect} incorrect)`}
          />
          <span className="mt-1 hidden text-center text-[10px] text-muted-foreground group-hover:block">
            {p.correct + p.incorrect}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [studentId, setStudentId] = useState<string>("all");
  const [activityType, setActivityType] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState<string>("14");

  const studentsQuery = useQuery({
    queryKey: ["reports-students", search],
    queryFn: () =>
      api.reportStudents({
        search: search || undefined,
        limit: 500,
      }),
  });

  const activitiesQuery = useQuery({
    queryKey: ["reports-activities", studentId, activityType, from, to],
    queryFn: () =>
      api.reportActivities({
        studentId:
          studentId && studentId !== "all" ? Number(studentId) : undefined,
        activityType:
          activityType && activityType !== "all" ? activityType : undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const trendQuery = useQuery({
    queryKey: ["reports-trend", days],
    queryFn: () => api.reportReviewTrend({ days: Number(days) }),
  });

  const recentQuery = useQuery({
    queryKey: ["reports-recent"],
    queryFn: () => api.reportRecentActivity({ limit: 30 }),
  });

  const studentOptions = useMemo(() => {
    return (studentsQuery.data ?? []).map((s) => ({
      value: String(s.studentId),
      label: s.displayName,
    }));
  }, [studentsQuery.data]);

  const students = studentsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Learning status, activity performance and review trends from real
          database state.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Students & learning status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search students…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearch(searchInput.trim());
                }}
              />
              <Button
                variant="secondary"
                onClick={() => setSearch(searchInput.trim())}
              >
                Filter
              </Button>
              {(search || studentsQuery.isError) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            {studentsQuery.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : studentsQuery.isError ? (
              <p className="text-sm text-destructive">
                Could not load student reports.
              </p>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students assigned to you yet. Create a student or an
                assignment to start tracking learning.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[18%]">Student</TableHead>
                    <TableHead className="w-[50%]">Status distribution</TableHead>
                    <TableHead className="w-[10%] text-right">Due</TableHead>
                    <TableHead className="w-[11%] text-right">Reviews</TableHead>
                    <TableHead className="w-[11%] text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.studentId}>
                      <TableCell className="font-medium">
                        {s.displayName}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="space-y-1">
                          <StatusBar
                            counts={{
                              ASSIGNED: s.assigned,
                              ENCOUNTERED: s.encountered,
                              LEARNING: s.learning,
                              REVIEWING: s.reviewing,
                              MASTERED: s.mastered,
                            }}
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {Object.entries(STATUS_LABELS).map(
                              ([status, label]) => (
                                <span key={status}>
                                  <span
                                    className="mr-1 inline-block size-2 rounded-full"
                                    style={{
                                      backgroundColor: STATUS_COLORS[status],
                                    }}
                                  />
                                  {label} {s[status.toLowerCase() as keyof typeof s]}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.due > 0 ? (
                          <Badge variant="destructive">{s.due}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{s.reviewsDone}</TableCell>
                      <TableCell className="text-right">{s.sessionCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-32">
              <Label className="text-xs">Window</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trendQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : trendQuery.isError ? (
              <p className="text-sm text-destructive">
                Could not load review trend.
              </p>
            ) : (
              <TrendBars points={trendQuery.data ?? []} />
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Reviews
              </span>
              <span>A daily bar for each day in the window.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Label className="text-xs">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {studentOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs">Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="FLASHCARDS">Flashcards</SelectItem>
                  <SelectItem value="MEMORY">Memory</SelectItem>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                  <SelectItem value="FILL_BLANK">Fill in the blank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="mt-1 w-40"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="mt-1 w-40"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {activitiesQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activitiesQuery.isError ? (
            <p className="text-sm text-destructive">
              Could not load activity reports.
            </p>
          ) : (activitiesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activities match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Activity</TableHead>
                  <TableHead className="w-[16%]">Student</TableHead>
                  <TableHead className="w-[10%]">Sessions</TableHead>
                  <TableHead className="w-[10%] text-right">Correct</TableHead>
                  <TableHead className="w-[10%] text-right">Incorrect</TableHead>
                  <TableHead className="w-[12%] text-right">Avg progress</TableHead>
                  <TableHead className="w-[14%]">Last session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activitiesQuery.data ?? []).map((a: ReportActivity) => (
                  <TableRow key={a.activityId}>
                    <TableCell className="font-medium">
                      {a.activityTitle}
                      <Badge variant="secondary" className="ml-2">
                        {a.activityType}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.studentDisplayName}</TableCell>
                    <TableCell>{a.sessionCount}</TableCell>
                    <TableCell className="text-right">{a.totalCorrect}</TableCell>
                    <TableCell className="text-right">{a.totalIncorrect}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        a.totalIncorrect > a.totalCorrect &&
                          "text-destructive",
                      )}
                    >
                      {a.avgPercentComplete}%
                    </TableCell>
                    <TableCell>{formatDate(a.lastSessionAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentQuery.isError ? (
            <p className="text-sm text-destructive">
              Could not load recent activity.
            </p>
          ) : (recentQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity events yet. Ask a student to run an activity.
            </p>
          ) : (
            <ul className="space-y-2">
              {(recentQuery.data ?? []).slice(0, 15).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium">{ev.studentDisplayName}</span>
                    {ev.lemma ? (
                      <>
                        {" · "}
                        <span className="text-muted-foreground">
                          {ev.lemma}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{ev.eventType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}