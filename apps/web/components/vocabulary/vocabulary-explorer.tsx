"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ExternalLink, RotateCcw, Search, SearchX } from "lucide-react";
import {
  api,
  CEFR_OPTIONS,
  POS_OPTIONS,
  SORT_OPTIONS,
  type SortField,
  type SortOrder,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SenseDetailDialog } from "./sense-detail-dialog";

const PAGE_SIZE = 25;

const CEFR_TONE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  A2: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  B1: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  B2: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  C1: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  C2: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

export function VocabularyExplorer({
  initialCategory = "",
}: {
  initialCategory?: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState<string>("all");
  const [cefr, setCefr] = useState<string>("all");
  const [hasPolish, setHasPolish] = useState<string>("all");
  const [category, setCategory] = useState(initialCategory);
  const [frequencyRank, setFrequencyRank] = useState<string>("");
  const [sort, setSort] = useState<SortField>("lemma");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const debounceTimer = useRef<number | undefined>(undefined);

  const queueSearchDebounce = (value: string) => {
    window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => setDebouncedSearch(value), 300);
  };

  const filtersDirty =
    debouncedSearch !== search || partOfSpeech !== "all" || cefr !== "all" ||
    hasPolish !== "all" || frequencyRank !== "" || category !== "";

  const query = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    partOfSpeech: partOfSpeech === "all" ? undefined : partOfSpeech,
    cefr: cefr === "all" ? undefined : cefr,
    category: category.trim() || undefined,
    hasPolishTranslation:
      hasPolish === "all" ? undefined : hasPolish === "yes",
    frequencyRank: frequencyRank ? Number(frequencyRank) : undefined,
    sort,
    order,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["vocabulary", query],
    queryFn: ({ signal }) => api.listVocabulary(query, signal),
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.meta.totalPages ?? 1;

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPartOfSpeech("all");
    setCefr("all");
    setHasPolish("all");
    setCategory("");
    setFrequencyRank("");
    setSort("lemma");
    setOrder("asc");
    setPage(1);
  };

  const previewEntry = (entryId: number) => {
    setSelectedEntryId(entryId);
    void queryClient.prefetchQuery({
      queryKey: ["vocabulary-entry", entryId],
      queryFn: () => api.getVocabularyEntry(entryId),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Vocabulary</h1>
        <p className="text-sm text-muted-foreground">
          Browse the sense catalog straight from the PostgreSQL database.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="vocab-search">Search</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vocab-search"
                  className="pl-8"
                  placeholder="lemma, definition, Polish… (e.g. bank)"
                  value={search}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearch(value);
                    setPage(1);
                    queueSearchDebounce(value);
                  }}
                />
              </div>
            </div>

            <div>
              <Label>Part of speech</Label>
              <div className="mt-1.5">
                <Select
                  value={partOfSpeech}
                  onValueChange={(v) => {
                    setPartOfSpeech(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {POS_OPTIONS.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>CEFR level</Label>
              <div className="mt-1.5">
                <Select
                  value={cefr}
                  onValueChange={(v) => {
                    setCefr(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CEFR_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="vocab-category">Category</Label>
              <Input
                id="vocab-category"
                className="mt-1.5"
                placeholder="e.g. travel, food"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <Label>Polish translation</Label>
              <div className="mt-1.5">
                <Select
                  value={hasPolish}
                  onValueChange={(v) => {
                    setHasPolish(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Has Polish</SelectItem>
                    <SelectItem value="no">No Polish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="freq-rank">Max NGSL rank</Label>
              <Input
                id="freq-rank"
                className="mt-1.5"
                inputMode="numeric"
                placeholder="e.g. 1000"
                value={frequencyRank}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 9);
                  setFrequencyRank(value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <Label>Sort</Label>
              <div className="mt-1.5">
                <Select
                  value={`${sort}:${order}`}
                  onValueChange={(v) => {
                    const [s, o] = v.split(":") as [SortField, SortOrder];
                    setSort(s);
                    setOrder(o);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={`${opt.value}:asc`}
                        value={`${opt.value}:asc`}
                      >
                        {opt.label} ↑
                      </SelectItem>
                    ))}
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={`${opt.value}:desc`}
                        value={`${opt.value}:desc`}
                      >
                        {opt.label} ↓
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RotateCcw className="size-3.5" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={!filtersDirty && page === 1}
            >
              Reset filters
            </Button>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              {data ? (
                <>
                  <span>
                    {data.meta.total.toLocaleString()} senses
                  </span>
                  <span>
                    · page {data.meta.page} / {Math.max(data.meta.totalPages, 1)}
                  </span>
                  {isFetching ? <span>· loading…</span> : null}
                </>
              ) : (
                <span>querying…</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && !data ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <SearchX className="size-8 text-destructive" />
            <p className="font-medium">Could not load vocabulary</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-medium">No senses matched your filters</p>
            <p className="text-sm text-muted-foreground">
              Try a broader search or clear some filters.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lemma</TableHead>
                  <TableHead>POS</TableHead>
                  <TableHead>Definition</TableHead>
                  <TableHead>Polish</TableHead>
                  <TableHead>CEFR</TableHead>
                  <TableHead className="text-right">Freq</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => previewEntry(row.entryId)}
                  >
                    <TableCell className="font-medium">
                      {row.lemma}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        #{row.position}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.partOfSpeech}</Badge>
                    </TableCell>
                    <TableCell className="max-w-96 text-sm text-muted-foreground">
                      <span className="line-clamp-2">{row.definition}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {row.translations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          row.translations.map((t) => (
                            <Badge key={t.id} variant="outline">
                              {t.text}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.cefrLevels.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          row.cefrLevels.map((level) => (
                            <Badge key={level} className={CEFR_TONE[level]}>
                              {level}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.frequencyRank === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        row.frequencyRank
                      )}
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {data?.meta.page ?? page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isFetching}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>

      <SenseDetailDialog
        entryId={selectedEntryId}
        onOpenChange={(open) => {
          if (!open) setSelectedEntryId(null);
        }}
      />
    </div>
  );
}