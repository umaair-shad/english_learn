"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Loader2, Plus, X } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { api, type ActivityStatus, type ActivityType } from "@/lib/api";
import { StatusBadge } from "@/components/activities/status-badges";
import { ActivityTypeBadge } from "@/components/activities/activity-type-badge";
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
  DialogBody,
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
import { ProgressBar } from "@/app/teacher/assignments/page";

const ACTIVITY_TYPES: ActivityType[] = [
  "FLASHCARDS",
  "MEMORY",
  "QUIZ",
  "FILL_BLANK",
];
const ACTIVITY_STATUSES: ActivityStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

export default function ActivitiesPage() {
  const router = useRouter();
  const [studentFilter, setStudentFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("activities");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["activities", { studentFilter, status, typeFilter, search, page, limit }],
    queryFn: () =>
      api.listActivities({
        studentId: studentFilter === "all" ? undefined : Number(studentFilter),
        status: status === "all" ? undefined : (status as ActivityStatus),
        activityType: typeFilter === "all" ? undefined : (typeFilter as ActivityType),
        search: search || undefined,
        page,
        limit,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Activity definitions built from assignments or manual vocabulary
            selections, complete with run sessions and standardized event
            streams.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          New activity
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gamepad2 className="size-5 text-muted-foreground" />
            All activities
            {data ? (
              <span className="text-sm font-normal text-muted-foreground">
                {data.meta.total}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <VocabSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                resetPage();
              }}
              placeholder="Search activities…"
            />
            <StudentFilterSelect
              value={studentFilter}
              onChange={(v) => {
                setStudentFilter(v);
                resetPage();
              }}
            />
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any type</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {ACTIVITY_STATUSES.map((s) => (
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
              Could not load activities.{" "}
              <Button variant="link" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || status !== "all" || typeFilter !== "all" || studentFilter !== "all"
                ? "No activities match the current filters."
                : "No activities yet. Create one from the button above."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Activity</TableHead>
                  <TableHead className="w-[16%]">Student</TableHead>
                  <TableHead className="w-[12%]">Type</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[16%]">Latest session</TableHead>
                  <TableHead className="w-[16%] text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/teacher/activities/${row.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.itemCount} items
                        {row.assignment ? (
                          <span className="hidden sm:inline"> · from assignment</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.student.displayName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ActivityTypeBadge type={row.activityType} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      {row.latestSession ? (
                        <span className="text-xs text-muted-foreground">
                          #{row.latestSession.id} · {row.latestSession.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto flex w-32 items-center gap-2">
                        <ProgressBar
                          percent={row.latestSession?.percentComplete ?? 0}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
        </CardContent>
      </Card>

      <CreateActivityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.push(`/teacher/activities/${id}`)}
      />
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
    queryKey: ["students-for-activity-filter"],
    queryFn: () => api.listStudents({ limit: 100, isActive: "true", sort: "displayName", order: "asc" }),
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

function CreateActivityDialog({
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
  const [activityType, setActivityType] = useState<ActivityType | "">("");
  const [mode, setMode] = useState<
    "assignment" | "manual" | "set" | "assigned" | "due" | "difficult" | "catalog"
  >("manual");
  const [vocabularySetId, setVocabularySetId] = useState("");
  const [cefr, setCefr] = useState("all");
  const [category, setCategory] = useState("");
  const [direction, setDirection] = useState("EN_PL");
  const [assignmentId, setAssignmentId] = useState("");
  const [itemCount, setItemCount] = useState("");
  const [senseIds, setSenseIds] = useState<number[]>([]);
  const [senseQuery, setSenseQuery] = useState("");

  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["students-for-activity"],
    queryFn: () =>
      api.listStudents({
        limit: 100,
        isActive: "true",
        sort: "displayName",
        order: "asc",
      }),
    enabled: open,
  });

  const { data: vocabSets } = useQuery({
    queryKey: ["sets-for-activity"],
    queryFn: () => api.listVocabularySets({ limit: 200 }),
    enabled: mode === "set",
    placeholderData: (prev) => prev,
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments-for-activity", studentId],
    queryFn: () =>
      api.listAssignments({
        studentId: studentId ? Number(studentId) : undefined,
        limit: 200,
      }),
    enabled: studentId !== "" && mode === "assignment",
    placeholderData: (prev) => prev,
  });

  const { data: senseResults } = useQuery({
    queryKey: ["activity-manual-search", senseQuery.trim()],
    queryFn: () => api.searchVocabulary(senseQuery.trim(), 1, 10),
    enabled: senseQuery.trim().length >= 1,
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createActivity({
        studentId: Number(studentId),
        activityType: activityType as ActivityType,
        title,
        description: description || undefined,
        assignmentId: mode === "assignment" ? Number(assignmentId) : undefined,
        vocabularySetId: mode === "set" ? Number(vocabularySetId) : undefined,
        selection: mode,
        cefr: cefr === "all" ? undefined : cefr,
        category: category.trim() || undefined,
        itemCount: itemCount.trim() ? Number(itemCount) : undefined,
        senseIds: mode === "manual" ? senseIds : undefined,
        settings: activityType === "FLASHCARDS" ? { direction } : undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      onOpenChange(false);
      reset();
      onCreated(result.id);
    },
  });

  function reset() {
    setStudentId("");
    setTitle("");
    setDescription("");
    setActivityType("");
    setMode("manual");
    setAssignmentId("");
    setVocabularySetId("");
    setCefr("all");
    setCategory("");
    setDirection("EN_PL");
    setItemCount("");
    setSenseIds([]);
    setSenseQuery("");
    createMutation.reset();
  }

  function toggleSense(senseId: number) {
    setSenseIds((prev) =>
      prev.includes(senseId)
        ? prev.filter((id) => id !== senseId)
        : [...prev, senseId],
    );
  }

  const assignmentReady =
    mode === "assignment" && assignmentId !== "" && assignments !== undefined;
  const setReady = mode === "set" && vocabularySetId !== "";
  const poolReady = ["assigned", "due", "difficult", "catalog"].includes(mode);
  const contentReady =
    mode === "manual"
      ? senseIds.length > 0
      : mode === "assignment"
        ? assignmentReady
        : mode === "set"
          ? setReady
          : poolReady;

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
      <DialogContent className="h-[96dvh] sm:h-[min(92dvh,72rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="size-5" />
            New activity
          </DialogTitle>
          <DialogDescription>
            Create an activity definition. Students see it and run sessions from
            their token link.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={studentId || undefined}
                onValueChange={setStudentId}
                disabled={studentsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      studentsLoading
                        ? "Loading students…"
                        : studentsError
                          ? "Could not load students"
                          : "Choose a student"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(students?.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {studentsError ? (
                <p className="text-xs text-destructive">
                  Student list failed.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void refetchStudents()}
                  >
                    Retry
                  </button>
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Activity type</Label>
              <Select
                value={activityType || undefined}
                onValueChange={(v) => setActivityType(v as ActivityType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-title">Title</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Travel flashcards warm-up"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-description">
              Description (optional)
            </Label>
            <textarea
              id="activity-description"
              className="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Vocabulary source</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === "assignment" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("assignment")}
              >
                From assignment
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("manual")}
              >
                Manual senses
              </Button>
              <Button
                type="button"
                variant={mode === "set" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("set")}
              >
                Vocabulary set
              </Button>
              <Button
                type="button"
                variant={mode === "assigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("assigned")}
              >
                Assigned
              </Button>
              <Button
                type="button"
                variant={mode === "due" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("due")}
              >
                Due
              </Button>
              <Button
                type="button"
                variant={mode === "difficult" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("difficult")}
              >
                Difficult
              </Button>
              <Button
                type="button"
                variant={mode === "catalog" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("catalog")}
              >
                Catalog filter
              </Button>
            </div>
          </div>

          {activityType === "FLASHCARDS" ? (
            <div className="space-y-2">
              <Label>Flashcard direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_PL">English → Polish</SelectItem>
                  <SelectItem value="PL_EN">Polish → English</SelectItem>
                  <SelectItem value="BOTH">Both directions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === "assignment" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Assignment</Label>
                <Select
                  value={assignmentId || undefined}
                  onValueChange={setAssignmentId}
                  disabled={studentId === ""}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        studentId === ""
                          ? "Choose a student first…"
                          : "Choose an assignment"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(assignments?.data ?? []).map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.title} ({a.itemCount} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-item-count">
                  First N items (optional)
                </Label>
                <Input
                  id="activity-item-count"
                  type="number"
                  min={1}
                  value={itemCount}
                  onChange={(e) => setItemCount(e.target.value)}
                  placeholder="Use all items"
                />
              </div>
            </div>
          ) : mode === "manual" ? (
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
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground wrap-break-word">
                          {sense.definition}
                        </p>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mode === "set" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Vocabulary set</Label>
                  <Select
                    value={vocabularySetId || undefined}
                    onValueChange={setVocabularySetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a set" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vocabSets?.data ?? []).map((set) => (
                        <SelectItem key={set.id} value={String(set.id)}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>CEFR (optional)</Label>
                <Select value={cefr} onValueChange={setCefr}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-category">Category (optional)</Label>
                <Input
                  id="activity-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="travel, food…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-pool-count">Number of items</Label>
                <Input
                  id="activity-pool-count"
                  type="number"
                  min={1}
                  value={itemCount}
                  onChange={(e) => setItemCount(e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>
          )}

          {mode === "manual" && senseIds.length > 0 ? (
            <div className="space-y-2">
              <Label>Selected</Label>
              <div className="flex flex-wrap gap-1.5">
                {senseIds.map((sid) => (
                  <Badge key={sid} variant="outline">
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
              </div>
            </div>
          ) : null}

          {createMutation.isError ? (
            <p className="text-sm text-destructive">
              Failed to create the activity. Check the inputs and try again.
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {mode === "manual"
              ? `${senseIds.length} senses selected`
              : assignmentReady
                ? itemCount.trim()
                  ? `First ${itemCount} items of the assignment`
                  : "All assignment items"
                : "No source selected"}
          </span>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              !studentId ||
              !title.trim() ||
              !activityType ||
              !contentReady ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Create activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}