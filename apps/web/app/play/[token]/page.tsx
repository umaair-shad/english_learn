"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ActivityGameplay } from "@/components/activities/gameplay/activity-gameplay";
import { LearnerShell } from "@/components/learner-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayActivityPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["play-access", token],
    queryFn: () => api.resolvePlayAccess(token),
    enabled: token.length > 0,
    retry: false,
  });

  if (isLoading) {
    return (
      <LearnerShell eyebrow="Activity link" accessToken={token}>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </LearnerShell>
    );
  }

  if (isError || !data) {
    return (
      <LearnerShell eyebrow="Activity link" accessToken={token}>
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          This activity link is invalid, expired, or has already been used.
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell
      eyebrow={`${data.access.student.displayName} · ${data.access.linkType.toLowerCase()} link`}
      accessToken={token}
    >
      <ActivityGameplay
        token={token}
        activityId={data.access.activityId}
        mode="play"
      />
    </LearnerShell>
  );
}
