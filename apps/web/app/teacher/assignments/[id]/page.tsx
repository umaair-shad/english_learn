"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCheck,
  Loader2,
  Pencil,
  RotateCcw,
  User,
} from "lucide-react";
import {
  api,
  type AssignmentDetail,
  type AssignmentStatus,
} from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { LearningStatusBadge } from "@/components/students/status-badge";
import { ProgressBar } from "@/app/teacher/assignments/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_KEYS = [
  "assigned",
  "encountered",
  "learning",
  "reviewing",
  "mastered",
] as const;

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assignmentId = Number(params.id);
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => api.getAssignment(assignmentId),
    enabled: !isNaN(assignmentId),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateAssignment(assignmentId, { status: updatedStatus(data!) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/teacher/assignments")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to assignments
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Assignment not found</p>
            <p className="text-sm text-muted-foreground">
              It may have been deleted or the id is invalid.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusActions = getStatusActions(data.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/teacher/assignments")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Assignments
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <AssignmentStatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.description ?? "No description"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-normal text-muted-foreground"
              onClick={() =>
                router.push(`/teacher/students/${data.studentId}`)
              }
            >
              <User className="mr-1 size-4" />
              {data.student.displayName}
            </Button>
            {data.dueAt ? (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-4" />
                Due {new Date(data.dueAt).toLocaleString()}
              </span>
            ) : null}
            <span className="text-xs">
              Created {new Date(data.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={data.status === "CANCELLED"}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
          {statusActions.primary ? (
            <Button size="sm" onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 size-4" />
              )}
              {statusActions.primary.label}
            </Button>
          ) : null}
          {data.status === "CANCELLED" ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="mr-2 size-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            Mastery progress
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {data.progress.mastered} / {data.progress.total} mastered
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar percent={data.progress.percent} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STATUS_KEYS.map((key) => (
              <div
                key={key}
                className="flex flex-col items-center gap-1 rounded-md border px-2 py-2"
              >
                <LearningStatusBadge
                  status={key.toUpperCase() as Parameters<typeof LearningStatusBadge>[0]["status"]}
                />
                <span className="text-lg font-semibold tabular-nums">
                  {data.progress.countByStatus[key]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Assigned senses</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {data.items.length} senses
          </span>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No senses on this assignment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lemma</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden md:table-cell">CEFR</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Definition
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Polish</TableHead>
                  <TableHead>Learning</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Reviews
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.senseId}>
                    <TableCell>
                      <div className="font-medium">
                        {item.lemma}
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{item.senseId}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.partOfSpeech}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.source.type === "VOCABULARY_SET" ? (
                        <Badge variant="outline">
                          From set
                          {item.source.sourceSetId
                            ? ` #${item.source.sourceSetId}`
                            : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.cefrLevels.length > 0
                        ? item.cefrLevels.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-md lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {item.definition}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-56 lg:table-cell">
                      <span className="text-xs">
                        {item.translations.map((t) => t.text).join(", ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.learning ? (
                        <LearningStatusBadge status={item.learning} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell text-sm tabular-nums">
                      {item.reviewCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editOpen ? (
        <EditAssignmentDialog
          assignment={data}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      {cancelOpen ? (
        <CancelAssignmentDialog
          assignment={data}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          onCancelled={() =>
            queryClient.invalidateQueries({ queryKey: ["assignments"] })
          }
        />
      ) : null}
    </div>
  );
}

function getStatusActions(
  status: AssignmentStatus,
): { primary: { label: string; next: AssignmentStatus } | null } {
  if (status === "ASSIGNED" || status === "IN_PROGRESS") {
    return { primary: { label: "Mark completed", next: "COMPLETED" } };
  }
  if (status === "COMPLETED") {
    return { primary: { label: "Reopen", next: "IN_PROGRESS" } };
  }
  return { primary: null };
}

function updatedStatus(assignment: AssignmentDetail): AssignmentStatus {
  const actions = getStatusActions(assignment.status);
  return actions.primary?.next ?? assignment.status;
}

function EditAssignmentDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: AssignmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? "");
  const [dueAt, setDueAt] = useState(
    assignment.dueAt
      ? toLocalDatetimeValue(new Date(assignment.dueAt))
      : "",
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.updateAssignment(assignment.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      router.refresh();
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(openFlag) => {
        if (!openFlag && !mutation.isPending) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5" />
            Edit assignment
          </DialogTitle>
          <DialogDescription>
            Update the details of this assignment. Learning state is untouched.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <textarea
              id="edit-description"
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-due">Due date</Label>
            <Input
              id="edit-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelAssignmentDialog({
  assignment,
  open,
  onOpenChange,
  onCancelled,
}: {
  assignment: AssignmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => api.deleteAssignment(assignment.id),
    onSuccess: () => {
      onCancelled();
      onOpenChange(false);
      router.push("/teacher/assignments");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5" />
            Cancel assignment?
          </DialogTitle>
          <DialogDescription>
            The assignment will be marked as cancelled and hidden from the
            student. Existing learning state is kept.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            <RotateCcw className="mr-0 size-4" />
            Cancel assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}