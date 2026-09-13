"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookPlus, CalendarClock, Eye } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { api, type LearningStatus, type StudentVocabRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CEFR_OPTIONS, LEARNING_STATUSES } from "@/lib/api";
import { AssignSenseDialog } from "./assign-sense-dialog";
import { VocabSearchInput } from "./learning-summary";
import { SenseStateDialog } from "./sense-state-dialog";
import { LearningStatusBadge } from "./status-badge";

function dueLabel(nextReviewAt: string | null): string {
  if (!nextReviewAt) return "—";
  const diff = new Date(nextReviewAt).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export function StudentVocabularyTab({ studentId }: { studentId: number }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [cefr, setCefr] = useState<string>("all");
  const [due, setDue] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("student-vocabulary");
  const [selectedSense, setSelectedSense] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["student-vocabulary", studentId, { search, status, cefr, due, page, limit }],
    queryFn: () =>
      api.studentVocabulary(studentId, {
        page,
        limit,
        search: search || undefined,
        status: status === "all" ? undefined : (status as LearningStatus),
        cefr: cefr === "all" ? undefined : cefr,
        due: due === "all" ? undefined : due === "true",
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];

  function resetPage() {
    setPage(1);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          Vocabulary in learning space
          {data ? (
            <span className="text-sm font-normal text-muted-foreground">
              {data.meta.total} senses
            </span>
          ) : null}
        </CardTitle>
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          <BookPlus className="mr-2 size-4" />
          Assign sense
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <VocabSearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              resetPage();
            }}
            placeholder="Search…"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {LEARNING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cefr} onValueChange={(v) => { setCefr(v); resetPage(); }}>
            <SelectTrigger>
              <SelectValue placeholder="CEFR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any level</SelectItem>
              {CEFR_OPTIONS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={due} onValueChange={(v) => { setDue(v as typeof due); resetPage(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Due" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any due state</SelectItem>
              <SelectItem value="true">Due now</SelectItem>
              <SelectItem value="false">Not due</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Could not load vocabulary.{" "}
            <Button variant="link" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {search || status !== "all" || cefr !== "all" || due !== "all"
              ? "No senses match the current filters."
              : "No vocabulary assigned yet. Use “Assign sense” to add the first item."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16%]">Lemma</TableHead>
                <TableHead className="w-[8%]">POS</TableHead>
                <TableHead className="w-[8%]">CEFR</TableHead>
                <TableHead className="w-[36%]">Definition</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[12%]">Next review</TableHead>
                <TableHead className="w-[6%] text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <StudentVocabRowItem
                  key={row.state.senseId}
                  row={row}
                  onInspect={() => setSelectedSense(row.state.senseId)}
                />
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

      <SenseStateDialog
        studentId={studentId}
        senseId={selectedSense}
        onOpenChange={() => setSelectedSense(null)}
      />
      <AssignSenseDialog
        studentId={studentId}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </Card>
  );
}

function StudentVocabRowItem({
  row,
  onInspect,
}: {
  row: StudentVocabRow;
  onInspect: () => void;
}) {
  const { state, sense } = row;
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{sense.lemma}</div>
      </TableCell>
      <TableCell>
        <span className="text-xs">{sense.partOfSpeech}</span>
      </TableCell>
      <TableCell>
        {sense.cefrLevels.length > 0 ? sense.cefrLevels.join(", ") : "—"}
      </TableCell>
      <TableCell className="text-sm leading-relaxed text-muted-foreground">
        {sense.definition}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <LearningStatusBadge status={state.status} />
        {state.isDue ? (
          <span className="ml-2 text-xs font-medium text-amber-600">due</span>
        ) : null}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          {dueLabel(state.nextReviewAt)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onInspect}>
          <Eye className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}