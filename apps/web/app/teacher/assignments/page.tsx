"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ClipboardList,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  ASSIGNMENT_STATUSES,
  api,
} from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VocabSearchInput } from "@/components/students/learning-summary";

export default function AssignmentsPage() {
  const router = useRouter();
  const [studentFilter, setStudentFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["assignments", { studentFilter, status, search, page }],
    queryFn: () =>
      api.listAssignments({
        studentId: studentFilter === "all" ? undefined : Number(studentFilter),
        status: status === "all" ? undefined : (status as (typeof ASSIGNMENT_STATUSES)[number]),
        search: search || undefined,
        page,
        limit: 10,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 0;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            Vocabulary assigned to students, with live progress from their
            learning space.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          New assignment
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-5 text-muted-foreground" />
            All assignments
            {data ? (
              <span className="text-sm font-normal text-muted-foreground">
                {data.meta.total}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <VocabSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                resetPage();
              }}
              placeholder="Search assignments…"
            />
            <StudentFilterSelect
              value={studentFilter}
              onChange={(v) => {
                setStudentFilter(v);
                resetPage();
              }}
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {ASSIGNMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-destructive">
              Could not load assignments.{" "}
              <Button variant="link" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || status !== "all" || studentFilter !== "all"
                ? "No assignments match the current filters."
                : "No assignments yet. Create one for a student to get started."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Student
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Due</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/teacher/assignments/${row.id}`)
                    }
                  >
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.itemCount} items · {row.masteredCount} mastered
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.student.displayName}
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {row.dueAt
                          ? new Date(row.dueAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto flex w-32 items-center gap-2">
                        <ProgressBar percent={row.progress} />
                      </div>
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
      </Card>

      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.push(`/teacher/assignments/${id}`)}
      />
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {percent}%
      </span>
    </div>
  );
}

function StudentFilterSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["students-for-filter"],
    queryFn: () => api.listStudents({ limit: 200 }),
    placeholderData: (prev) => prev,
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Student" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All students</SelectItem>
        {data?.data.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateAssignmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [setIds, setSetIds] = useState<number[]>([]);
  const [senseIds, setSenseIds] = useState<number[]>([]);
  const [senseQuery, setSenseQuery] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students-for-create"],
    queryFn: () => api.listStudents({ limit: 200 }),
    placeholderData: (prev) => prev,
  });

  const { data: sets } = useQuery({
    queryKey: ["sets-for-assignment"],
    queryFn: () =>
      api.listVocabularySets({ isActive: "true", limit: 200, sort: "name" }),
    placeholderData: (prev) => prev,
  });

  const { data: senseResults } = useQuery({
    queryKey: ["assignment-manual-search", senseQuery.trim()],
    queryFn: () => api.searchVocabulary(senseQuery.trim(), 1, 10),
    enabled: senseQuery.trim().length >= 1,
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAssignment({
        studentId: Number(studentId),
        title,
        description: description || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        senseIds: senseIds.length > 0 ? senseIds : undefined,
        vocabularySetIds: setIds.length > 0 ? setIds : undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      onOpenChange(false);
      reset();
      onCreated(result.id);
    },
  });

  function reset() {
    setStudentId("");
    setTitle("");
    setDescription("");
    setDueAt("");
    setSetIds([]);
    setSenseIds([]);
    setSenseQuery("");
    createMutation.reset();
  }

  const totalKnown = useMemo(() => {
    let count = senseIds.length;
    for (const sid of setIds) {
      const set = sets?.data.find((s) => s.id === sid);
      if (set) count += set.itemCount;
    }
    return count;
  }, [senseIds, setIds, sets]);

  function toggleSense(senseId: number) {
    setSenseIds((prev) =>
      prev.includes(senseId)
        ? prev.filter((id) => id !== senseId)
        : [...prev, senseId],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(openFlag) => {
        if (!openFlag && !createMutation.isPending) {
          onOpenChange(false);
          reset();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5" />
            New assignment
          </DialogTitle>
          <DialogDescription>
            Create a vocabulary assignment for a student. You can draw senses
            from vocabulary sets and add individual senses manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students?.data.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-at">Due date (optional)</Label>
              <Input
                id="due-at"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Banking vocabulary unit 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              className="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>From vocabulary sets</Label>
              {!sets ? (
                <Skeleton className="h-40 w-full" />
              ) : sets.data.length === 0 ? (
                <p className="rounded-md border px-3 py-4 text-center text-sm text-muted-foreground">
                  No active sets available.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {sets.data.map((set) => (
                    <label
                      key={set.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={setIds.includes(set.id)}
                        onChange={() =>
                          setSetIds((prev) =>
                            prev.includes(set.id)
                              ? prev.filter((id) => id !== set.id)
                              : [...prev, set.id],
                          )
                        }
                        className="size-4"
                      />
                      <span className="flex-1 truncate">{set.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {set.itemCount}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Manual senses</Label>
              <VocabSearchInput
                value={senseQuery}
                onChange={setSenseQuery}
                placeholder="Search to add a sense…"
              />
              {senseQuery.trim().length === 0 ? (
                <p className="rounded-md border px-3 py-4 text-center text-sm text-muted-foreground">
                  Type a search to add individual senses.
                </p>
              ) : !senseResults ? (
                <Skeleton className="h-40 w-full" />
              ) : senseResults.data.length === 0 ? (
                <p className="rounded-md border px-3 py-4 text-center text-sm text-muted-foreground">
                  No senses matched.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {senseResults.data.map((sense) => (
                    <button
                      key={sense.id}
                      type="button"
                      onClick={() => toggleSense(sense.id)}
                      className="flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={senseIds.includes(sense.id)}
                        readOnly
                        className="mt-0.5 size-4"
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{sense.lemma}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{sense.id}
                        </span>
                        <p className="truncate text-xs text-muted-foreground">
                          {sense.definition}
                        </p>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(senseIds.length > 0 || setIds.length > 0) && (
            <div className="space-y-2">
              <Label>Selected</Label>
              <div className="flex flex-wrap gap-1.5">
                {senseIds.map((sid) => (
                  <Badge key={`s${sid}`} variant="outline">
                    Sense #{sid}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() => toggleSense(sid)}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {setIds.map((sid) => (
                  <Badge
                    key={`set${sid}`}
                    variant="outline"
                    className="bg-sky-50"
                  >
                    Set:{" "}
                    {sets?.data.find((s) => s.id === sid)?.name ?? `#${sid}`}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() =>
                        setSetIds((prev) =>
                          prev.filter((id) => id !== sid),
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {createMutation.isError ? (
            <p className="text-sm text-destructive">
              Failed to create the assignment. Check the inputs and try again.
            </p>
          ) : null}
        </div>

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {totalKnown > 0
              ? `~${totalKnown} senses will be assigned`
              : "No senses selected"}
          </span>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              !studentId ||
              !title.trim() ||
              (senseIds.length === 0 && setIds.length === 0) ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Create assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}