"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Gamepad2,
  Loader2,
  Pencil,
  Play,
  User,
} from "lucide-react";
import { api, type ActivityStatus } from "@/lib/api";
import { StatusBadge } from "@/components/activities/status-badges";
import { ActivityTypeBadge } from "@/components/activities/activity-type-badge";
import { ProgressBar } from "@/app/teacher/assignments/page";
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

const ACTIVITY_STATUSES: ActivityStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const activityId = Number(params.id);
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [playLink, setPlayLink] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"PERMANENT" | "EXPIRING" | "SINGLE_USE">("PERMANENT");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => api.getActivity(activityId),
    enabled: !isNaN(activityId),
  });

  const { data: sessions } = useQuery({
    queryKey: ["activity-sessions", activityId],
    queryFn: () => api.listActivitySessions(activityId),
    enabled: !isNaN(activityId),
    placeholderData: (prev) => prev,
  });

  const playLinkMutation = useMutation({
    mutationFn: () =>
      api.createActivityPlayLink(activityId, {
        linkType,
        expiresInSeconds: linkType === "EXPIRING" ? 60 * 60 * 24 * 7 : undefined,
      }),
    onSuccess: (result) => setPlayLink(result.url),
  });

  const setStatusMutation = useMutation({
    mutationFn: (status: ActivityStatus) =>
      api.updateActivity(activityId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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
          onClick={() => router.push("/teacher/activities")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to activities
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Activity not found</p>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Private activity link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Link type</Label>
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={linkType}
              onChange={(e) =>
                setLinkType(e.target.value as "PERMANENT" | "EXPIRING" | "SINGLE_USE")
              }
            >
              <option value="PERMANENT">Permanent</option>
              <option value="EXPIRING">Expiring (7 days)</option>
              <option value="SINGLE_USE">Single use</option>
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => playLinkMutation.mutate()}
            disabled={playLinkMutation.isPending}
          >
            {playLinkMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Generate /play link
          </Button>
          {playLink ? (
            <code className="rounded bg-muted px-2 py-1 text-xs">{playLink}</code>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/teacher/activities")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Activities
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <ActivityTypeBadge type={data.activityType} />
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.description ?? "No description"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-normal text-muted-foreground"
              onClick={() => router.push(`/teacher/students/${data.studentId}`)}
            >
              <User className="mr-1 size-4" />
              {data.student.displayName}
            </Button>
            {data.assignment ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 font-normal text-muted-foreground"
                onClick={() =>
                  router.push(`/teacher/assignments/${data.assignment!.id}`)
                }
              >
                Assignment: {data.assignment.title}
              </Button>
            ) : null}
            <span className="text-xs">
              Created {new Date(data.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {ACTIVITY_STATUSES.filter(
            (s) => s !== data.status && s !== "CANCELLED",
          ).map((s) => (
            <Button
              key={s}
              variant={s === "ACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusMutation.mutate(s)}
              disabled={setStatusMutation.isPending}
            >
              {s === "ACTIVE" ? <Play className="mr-2 size-4" /> : null}
              Set {s}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={data.status === "CANCELLED"}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
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
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Vocabulary items</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {data.itemCount} items
          </span>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No items on this activity.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lemma</TableHead>
                  <TableHead className="hidden md:table-cell">CEFR</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Definition
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Polish
                  </TableHead>
                  <TableHead className="text-right">Position</TableHead>
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
                    <TableCell className="text-right text-sm tabular-nums">
                      {item.position}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gamepad2 className="size-5 text-muted-foreground" />
            Sessions
          </CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {data.sessionCount} total
          </span>
        </CardHeader>
        <CardContent>
          {!sessions ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No sessions yet. The student starts one from their token link.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Started
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Ended</TableHead>
                  <TableHead className="text-right">
                    Correct / answered
                  </TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/teacher/activity-sessions/${session.id}`)
                    }
                  >
                    <TableCell>
                      <div className="font-medium">Session #{session.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {session.totalItems} items ·{" "}
                        {session.correctCount} correct ·{" "}
                        {session.incorrectCount} incorrect
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.startedAt).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {session.finishedAt
                          ? new Date(session.finishedAt).toLocaleString()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {session.correctCount} / {session.completedCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto flex w-32 items-center gap-2">
                        <ProgressBar percent={session.percentComplete} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editOpen ? (
        <EditActivityDialog
          activityId={activityId}
          initialTitle={data.title}
          initialDescription={data.description ?? ""}
          disabled={data.status === "CANCELLED"}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}

      {cancelOpen ? (
        <CancelActivityDialog
          activityId={activityId}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteActivityDialog
          activityId={activityId}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </div>
  );
}

function EditActivityDialog({
  activityId,
  initialTitle,
  initialDescription,
  disabled,
  open,
  onOpenChange,
}: {
  activityId: number;
  initialTitle: string;
  initialDescription: string;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateActivity(activityId, {
        title: title.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
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
            Edit activity
          </DialogTitle>
          <DialogDescription>
            Update the title and description. Items and sessions are untouched.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-activity-title">Title</Label>
            <Input
              id="edit-activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-activity-description">Description</Label>
            <textarea
              id="edit-activity-description"
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending || disabled}
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

function CancelActivityDialog({
  activityId,
  open,
  onOpenChange,
}: {
  activityId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.updateActivity(activityId, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5" />
            Cancel activity?
          </DialogTitle>
          <DialogDescription>
            The student will no longer be able to start this activity. Existing
            sessions and learning state stay intact.
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
            Cancel activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteActivityDialog({
  activityId,
  open,
  onOpenChange,
}: {
  activityId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      onOpenChange(false);
      router.push("/teacher/activities");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5" />
            Delete activity?
          </DialogTitle>
          <DialogDescription>
            If the activity already has sessions it is cancelled instead of
            deleted. Otherwise it is removed completely.
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
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}