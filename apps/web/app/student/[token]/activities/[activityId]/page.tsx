"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityGameplay } from "@/components/activities/gameplay/activity-gameplay";

export default function StudentActivityPage() {
  const params = useParams<{ token: string; activityId: string }>();
  const token = params.token;
  const activityId = Number(params.activityId);

  const { data: access, isLoading: validating, isError: accessError } = useQuery({
    queryKey: ["student-access", token],
    queryFn: () => api.resolveAccessToken(token!),
    enabled: !!token,
    retry: false,
  });

  if (validating) {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Centered>
    );
  }

  return (
    <div className="min-h-svh bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/student/${token}`}>
            <ArrowLeft className="mr-2 size-4" />
            Your space
          </Link>
        </Button>

        {accessError || !access ? (
          <Card>
            <CardHeader className="flex flex-col items-center text-center">
              <AlertCircle className="mb-2 size-10 text-destructive" />
              <CardTitle className="text-xl">Invalid Link</CardTitle>
              <CardDescription>
                This access token is invalid, expired, or has been revoked.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : Number.isInteger(activityId) && activityId > 0 ? (
          <ActivityGameplay token={token!} activityId={activityId} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Invalid activity link.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
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