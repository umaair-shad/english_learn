"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { ProgressBar } from "@/app/teacher/assignments/page";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentAssignmentsTab({ studentId }: { studentId: number }) {
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["assignments", { studentId }],
    queryFn: () => api.listAssignments({ studentId, page: 1, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-destructive">
        Could not load assignments.{" "}
        <Button variant="link" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <ClipboardList className="mx-auto mb-3 size-8" />
        No assignments for this student yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assignment</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden lg:table-cell">Due</TableHead>
          <TableHead className="text-right">Progress</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => router.push(`/teacher/assignments/${row.id}`)}
          >
            <TableCell>
              <div className="font-medium">{row.title}</div>
              <div className="text-xs text-muted-foreground">
                {row.itemCount} items · created{" "}
                {new Date(row.createdAt).toLocaleDateString()}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <AssignmentStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
              {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="ml-auto w-36">
                <ProgressBar percent={row.progress} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}