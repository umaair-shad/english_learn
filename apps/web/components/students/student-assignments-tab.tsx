"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
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
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("student-assignments");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["assignments", { studentId, page, limit }],
    queryFn: () => api.listAssignments({ studentId, page, limit }),
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
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Assignment</TableHead>
            <TableHead className="w-[16%]">Status</TableHead>
            <TableHead className="w-[16%]">Due</TableHead>
            <TableHead className="w-[28%] text-right">Progress</TableHead>
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
              <TableCell className="whitespace-nowrap">
                <AssignmentStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
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
      <ListPagination
        page={data?.meta.page ?? page}
        limit={limit}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 0}
        hasNext={data?.meta.hasNext}
        hasPrev={data?.meta.hasPrev}
        disabled={isFetching}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />
    </div>
  );
}