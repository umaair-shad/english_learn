"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Search } from "lucide-react";
import { api, CEFR_OPTIONS } from "@/lib/api";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [cefr, setCefr] = useState("all");
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("find-vocabulary");
  const [collectionName, setCollectionName] = useState("");

  const query = {
    page,
    limit,
    search: topic.trim() || undefined,
    cefr: cefr === "all" ? undefined : cefr,
    lexicalOnly: true,
    sort: "frequency" as const,
    order: "asc" as const,
  };

  const results = useQuery({
    queryKey: ["find-vocabulary", query],
    queryFn: () => api.listVocabulary(query),
    enabled: topic.trim().length >= 2 || cefr !== "all",
    placeholderData: (prev) => prev,
  });

  const save = useMutation({
    mutationFn: async () => {
      const name =
        collectionName.trim() ||
        [cefr !== "all" ? cefr : null, topic.trim() || "Collection"].filter(Boolean).join(" · ");
      const ids = await api.listVocabularyIds({ ...query, page: 1, limit: 200 });
      if (ids.senseIds.length === 0) throw new Error("No matching words to save.");
      return api.createVocabularySet({
        name,
        description: `On-the-fly collection: ${topic || "any topic"}${cefr !== "all" ? ` · ${cefr}` : ""}`,
        senseIds: ids.senseIds,
      });
    },
    onSuccess: () => {
      setCollectionName("");
      queryClient.invalidateQueries({ queryKey: ["vocabulary-sets"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">Find vocabulary</h1>
        <p className="app-page-lead">
          Ask for words as you need them — for example B2 cooking — then save the
          result as a reusable collection. Collections are global, not per student.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build a collection on the fly</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="topic">Topic or word</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="topic"
                className="pl-8"
                placeholder="cooking, travel, money…"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>CEFR</Label>
            <Select
              value={cefr}
              onValueChange={(v) => {
                setCefr(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any level</SelectItem>
                {CEFR_OPTIONS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collection-name">Save as</Label>
            <div className="flex gap-2">
              <Input
                id="collection-name"
                placeholder="B2 cooking"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
              />
              <Button
                disabled={save.isPending || (topic.trim().length < 2 && cefr === "all")}
                onClick={() => save.mutate()}
              >
                <FolderPlus className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {save.isSuccess ? (
        <p className="text-sm text-emerald-700">
          Collection saved. Open{" "}
          <Link className="underline" href="/teacher/vocabulary-sets">
            Collections
          </Link>{" "}
          to reuse it in activities.
        </p>
      ) : null}
      {save.isError ? (
        <p className="text-sm text-destructive">
          {save.error instanceof Error ? save.error.message : "Could not save."}
        </p>
      ) : null}

      {results.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : results.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {results.data.meta.total.toLocaleString()} matching senses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.data.data.map((row) => (
              <div key={row.id} className="rounded-xl border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.lemma}</span>
                  <Badge variant="secondary">{row.partOfSpeech}</Badge>
                  {row.cefrLevels.map((level) => (
                    <Badge key={level} variant="outline">
                      {level}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.definition}</p>
                {row.translations.length > 0 ? (
                  <p className="mt-1 text-sm text-primary">
                    {row.translations.map((t) => t.text).join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
            <ListPagination
              page={results.data.meta.page}
              limit={limit}
              total={results.data.meta.total}
              totalPages={results.data.meta.totalPages}
              hasNext={results.data.meta.hasNext}
              hasPrev={results.data.meta.hasPrev}
              disabled={results.isFetching}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Type a topic (at least 2 letters) or pick a CEFR level to preview words.
        </p>
      )}
    </div>
  );
}
