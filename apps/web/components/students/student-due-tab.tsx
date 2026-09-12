"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SenseStateDialog } from "./sense-state-dialog";
import { LearningStatusBadge } from "./status-badge";

function dueLabel(nextReviewAt: string | null): string {
  if (!nextReviewAt) return "any time";
  const diff = Date.now() - new Date(nextReviewAt).getTime();
  if (diff <= 0) return "now";
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `overdue ${hours}h`;
  return `overdue ${Math.round(hours / 24)}d`;
}

export function StudentDueTab({ studentId }: { studentId: number }) {
  const [page, setPage] = useState(1);
  const [selectedSense, setSelectedSense] = useState<number | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["student-due-reviews", studentId, page],
    queryFn: () => api.studentDueReviews(studentId, { page, limit: 10 }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="size-5 text-amber-600" />
          Due for review now
          {data ? (
            <span className="text-sm font-normal text-muted-foreground">
              {data.meta.total} items
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Could not load due reviews.{" "}
            <Button variant="link" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing is due right now. Reviewing and learning cards appear here
            when their next review time passes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lemma</TableHead>
                <TableHead className="hidden md:table-cell">POS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Due</TableHead>
                <TableHead className="text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.state.senseId}>
                  <TableCell>
                    <div className="font-medium">{row.sense.lemma}</div>
                    <div className="max-w-64 truncate text-xs text-muted-foreground">
                      {row.sense.definition}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs">{row.sense.partOfSpeech}</span>
                  </TableCell>
                  <TableCell>
                    <LearningStatusBadge status={row.state.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs text-amber-600">
                      {dueLabel(row.state.nextReviewAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSense(row.state.senseId)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Page {data?.meta.page ?? page} of {Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <SenseStateDialog
        studentId={studentId}
        senseId={selectedSense}
        onOpenChange={() => setSelectedSense(null)}
      />
    </Card>
  );
}