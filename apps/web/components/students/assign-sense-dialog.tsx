"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookPlus, CircleCheckBig, Loader2, Plus, Search } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { api, type VocabularyListItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function AssignSenseDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("assign-sense");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vocab-search-assign", query.trim(), page, limit],
    queryFn: () =>
      api.listVocabulary({
        page,
        limit,
        search: query.trim(),
        lexicalOnly: true,
        sort: "frequency",
        order: "asc",
      }),
    enabled: open && query.trim().length >= 1,
    placeholderData: (prev) => prev,
  });

  const assignMutation = useMutation({
    mutationFn: (senseId: number) =>
      api.studentAssignSense(studentId, senseId, "manual"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-vocabulary", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-vocab-summary", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-due-reviews", studentId] });
    },
  });

  const results = data?.data ?? [];
  const assignedNow = assignMutation.variables;

  return (
    <Dialog
      open={open}
      onOpenChange={(openFlag) => {
        if (!openFlag) {
          onOpenChange(false);
          setQuery("");
          setPage(1);
          assignMutation.reset();
        }
      }}
    >
      <DialogContent className="h-[96dvh] sm:h-[min(92dvh,72rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="size-5" />
            Assign vocabulary
          </DialogTitle>
          <DialogDescription>
            Search the vocabulary database and add a sense to this student&apos;s
            learning space. Assignments are manual teacher actions.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search lemma, definition or Polish translation…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              autoFocus
            />
          </div>
        </div>

        <div>
          {!query.trim() ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type at least one character to search the dictionary.
            </p>
          ) : isLoading && !data ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Search failed.{" "}
              <Button variant="link" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No senses matched &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden gap-4 px-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[16rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem]">
                <span>Word</span>
                <span>Definition</span>
                <span>Polish</span>
                <span className="text-right">Assign</span>
              </div>
              {results.map((sense) => (
                <Row
                  key={sense.id}
                  sense={sense}
                  assigning={assignMutation.isPending && assignedNow === sense.id}
                  assigned={assignedNow === sense.id && assignMutation.isSuccess}
                  onAssign={() => assignMutation.mutate(sense.id)}
                />
              ))}
            </div>
          )}
        </div>
        </DialogBody>

        {data ? (
          <div className="shrink-0 border-t px-4 py-3 sm:px-6">
            <ListPagination
              page={data.meta.page}
              limit={limit}
              total={data.meta.total}
              totalPages={data.meta.totalPages}
              hasNext={data.meta.hasNext}
              hasPrev={data.meta.hasPrev}
              disabled={isFetching}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  sense,
  assigning,
  assigned,
  onAssign,
}: {
  sense: VocabularyListItem;
  assigning: boolean;
  assigned: boolean;
  onAssign: () => void;
}) {
  return (
    <div className="grid items-start gap-3 rounded-md border px-3 py-3 md:grid-cols-[16rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{sense.lemma}</span>
          <span className="text-xs text-muted-foreground">{sense.partOfSpeech}</span>
          {sense.cefrLevels.length > 0 ? (
            <Badge variant="outline">{sense.cefrLevels[0]}</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">#{sense.id}</p>
      </div>
      <p className="min-w-0 text-sm leading-relaxed wrap-break-word">
        {sense.definition}
      </p>
      <p className="min-w-0 text-sm leading-relaxed wrap-break-word">
        {sense.translations.length > 0 ? (
          sense.translations.map((t) => t.text).join(", ")
        ) : (
          <span className="text-muted-foreground">No Polish yet</span>
        )}
      </p>
      <Button
        size="sm"
        variant={assigned ? "ghost" : "outline"}
        disabled={assigning || assigned}
        onClick={onAssign}
        className="w-fit shrink-0 justify-self-end"
      >
        {assigning ? (
          <Loader2 className="size-4 animate-spin" />
        ) : assigned ? (
          <CircleCheckBig className="size-4 text-emerald-600" />
        ) : (
          <Plus className="size-4" />
        )}
      </Button>
    </div>
  );
}