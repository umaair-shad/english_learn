"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleCheckBig, Globe, Loader } from "lucide-react";
import { api, type VocabularyDetailEntry } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

function CefrBadge({ level, requiresReview }: { level: string; requiresReview: boolean }) {
  const tone: Record<string, string> = {
    A1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    A2: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    B1: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    B2: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
    C1: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    C2: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  };
  return (
    <Badge className={tone[level] ?? undefined} title="requires review">
      {level}
      {requiresReview ? (
        <AlertTriangle className="ml-1 size-3" />
      ) : (
        <CircleCheckBig className="ml-1 size-3" />
      )}
    </Badge>
  );
}

export function SenseDetailDialog({
  entryId,
  onOpenChange,
}: {
  entryId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocabulary-entry", entryId],
    queryFn: () => api.getVocabularyEntry(entryId as number),
    enabled: entryId !== null,
  });

  const entry = data as VocabularyDetailEntry | undefined;

  return (
    <Dialog
      open={entryId !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="h-[96dvh] sm:h-[min(92dvh,72rem)]">
        {isLoading || (!entry && entryId !== null) ? (
          <>
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
              <DialogTitle>{entryId ? `Entry #${entryId}` : "Loading…"}</DialogTitle>
              <DialogDescription>Sense detail from the live database.</DialogDescription>
            </DialogHeader>
            <div className="scrollbar-hidden min-h-0 flex-1 px-6 py-4">
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </>
        ) : isError || !entry ? (
          <>
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
              <DialogTitle>{entryId ? `Entry #${entryId}` : "Error"}</DialogTitle>
              <DialogDescription>Sense detail from the live database.</DialogDescription>
            </DialogHeader>
            <div className="scrollbar-hidden min-h-0 flex-1 space-y-3 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                This entry could not be loaded from the database.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={entryId === null}
              >
                <Loader className="size-3.5" />
                Retry
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b bg-popover px-6 py-4 pr-14">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-xl">
                    {entry.lemma}
                    <Badge variant="secondary" className="ml-2 align-middle">
                      {entry.partOfSpeech}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    entry {entry.id} · normalized “{entry.normalizedLemma}” ·{" "}
                    {entry.language}
                    {entry.displayForm ? ` · display form “${entry.displayForm}”` : ""}
                    {entry.wikidataQid ? (
                      <span className="inline-flex items-center gap-1">
                        {" "}
                        · qid {entry.wikidataQid}
                        <Globe className="size-3" />
                      </span>
                    ) : null}
                  </DialogDescription>
                </div>
                {entry.frequency.length > 0 ? (
                  <div className="text-right text-sm">
                    <span className="text-xs text-muted-foreground">frequency</span>
                    <div className="font-semibold tabular-nums">
                      rank {entry.frequency[0].rank ?? "—"}
                    </div>
                    {entry.frequency[0].sfi !== null ? (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        SFI {entry.frequency[0].sfi}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="scrollbar-hidden min-h-0 flex-1 px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Senses ({entry.senses.length})
                </h3>
                {entry.senses.map((sense) => (
                  <div key={sense.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">#{sense.position}</Badge>
                      <Badge variant="secondary">{sense.partOfSpeech}</Badge>
                      {sense.cefr.length > 0
                        ? sense.cefr.map((c) => (
                            <CefrBadge
                              key={c.level}
                              level={c.level}
                              requiresReview={c.requiresReview}
                            />
                          ))
                        : null}
                      {sense.categories.map((cat) => (
                        <Badge key={cat.code} variant="outline">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>

                    <p className="mt-2 max-w-none text-base leading-relaxed">
                      {sense.definition}
                    </p>

                    {sense.translations.length > 0 ? (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Polish:</span>{" "}
                        <span className="text-sm">
                          {sense.translations.map((t) => t.text).join(", ")}
                        </span>
                      </div>
                    ) : null}

                    {sense.wordnet.length > 0 ? (
                      <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                        {sense.wordnet.map((w) => (
                          <div key={w.synsetId} className="flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0 font-mono">
                              {w.synsetId}
                            </Badge>
                            <span className="text-muted-foreground">
                              {w.definition}
                              <span className="block text-[11px]">
                                {w.confidence} · score {w.score ?? "—"} ·{" "}
                                {w.members.length} members
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {sense.examples.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {sense.examples.map((ex) => (
                          <blockquote
                            key={ex.id}
                            className="border-l-2 pl-3 text-sm leading-relaxed italic text-muted-foreground"
                          >
                            {ex.text}
                            <span className="ml-2 not-italic text-xs">
                              — {ex.source}
                            </span>
                          </blockquote>
                        ))}
                      </div>
                    ) : null}

                    {sense.translations.length === 0 &&
                    sense.wordnet.length === 0 &&
                    sense.examples.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No enrichments recorded for this sense.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}