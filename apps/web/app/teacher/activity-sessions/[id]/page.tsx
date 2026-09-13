"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { api } from "@/lib/api";
import { StatusBadge, EventTypeBadge } from "@/components/activities/status-badges";
import { ActivityTypeBadge } from "@/components/activities/activity-type-badge";
import { ProgressBar } from "@/app/teacher/assignments/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = Number(params.id);
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("session-events");

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["session-meta", sessionId],
    queryFn: () => api.getSession(sessionId),
    enabled: !isNaN(sessionId),
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["session-events", sessionId, page, limit],
    queryFn: () =>
      api.sessionEvents(sessionId, { page, limit }),
    enabled: !isNaN(sessionId),
  });

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/teacher/activities")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to activities
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Session not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = events?.meta;
  const rows = events?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() =>
            router.push(`/teacher/activities/${session.activityId}`)
          }
        >
          <ArrowLeft className="mr-2 size-4" />
          Activity {session.activity?.title ? `· ${session.activity.title}` : ""}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Session #{session.id}</h1>
          <StatusBadge status={session.status} />
          {session.activity ? (
            <ActivityTypeBadge type={session.activity.activityType} />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Student #{session.studentId} · Started{" "}
          {new Date(session.startedAt).toLocaleString()}
          {session.finishedAt
            ? ` · Finished ${new Date(session.finishedAt).toLocaleString()}`
            : ""}
        </p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 py-5 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Total items</div>
            <div className="text-lg font-semibold tabular-nums">
              {session.totalItems}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Answered</div>
            <div className="text-lg font-semibold tabular-nums">
              {session.completedCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Correct</div>
            <div className="text-lg font-semibold tabular-nums">
              {session.correctCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
            <div className="text-lg font-semibold tabular-nums">
              {session.incorrectCount}
            </div>
          </div>
          <div className="col-span-2 md:col-span-4">
            <ProgressBar percent={session.percentComplete} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Event timeline</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {meta?.total ?? 0} events
          </span>
        </CardHeader>
        <CardContent>
          {loadingEvents && !events ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No events recorded yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {event.eventType}
                      </span>
                      <EventTypeBadge eventType={event.eventType} />
                      {event.sense ? (
                        <span className="text-xs text-muted-foreground">
                          {event.sense.lemma}{" "}
                          <span className="text-muted-foreground/60">
                            #{event.sense.senseId} · {event.sense.partOfSpeech}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {event.response ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.response}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleTimeString()}
                    </div>
                    {event.isCorrect !== null ? (
                      <div
                        className={
                          event.isCorrect
                            ? "text-xs font-medium text-emerald-600"
                            : "text-xs font-medium text-red-600"
                        }
                      >
                        {event.isCorrect ? "correct" : "incorrect"}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="pt-4">
            <ListPagination
              page={meta?.page ?? page}
              limit={limit}
              total={meta?.total ?? 0}
              totalPages={meta?.totalPages ?? 0}
              hasNext={meta?.hasNext}
              hasPrev={meta?.hasPrev}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}