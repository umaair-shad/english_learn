"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookPlus, CircleCheckBig, Loader2, Plus, Search } from "lucide-react";
import { api, type VocabularyListItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-search-assign", query.trim(), page],
    queryFn: () => api.searchVocabulary(query.trim(), page, 10),
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
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

        <div className="min-h-24">
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

        {data && data.meta.totalPages > 1 ? (
          <DialogFooter className="items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} results
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </DialogFooter>
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
    <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{sense.lemma}</span>
          <span className="text-xs text-muted-foreground">{sense.partOfSpeech}</span>
          {sense.cefrLevels.length > 0 ? (
            <Badge variant="outline">{sense.cefrLevels[0]}</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          #{sense.id} · {sense.definition}
        </p>
        {sense.translations.length > 0 ? (
          <p className="truncate text-xs">
            <span className="text-muted-foreground">Polish: </span>
            {sense.translations.map((t) => t.text).join(", ")}
          </p>
        ) : null}
      </div>
      <Button
        size="sm"
        variant={assigned ? "ghost" : "outline"}
        disabled={assigning || assigned}
        onClick={onAssign}
        className="shrink-0"
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