"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ActivityGameplay } from "@/components/activities/gameplay/activity-gameplay";
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
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        This activity link is invalid, expired, or has already been used.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="mb-4 text-sm text-muted-foreground">
        {data.access.student.displayName} · {data.access.linkType.toLowerCase()} link
      </p>
      <ActivityGameplay
        token={token}
        activityId={data.access.activityId}
        mode="play"
      />
    </div>
  );
}
