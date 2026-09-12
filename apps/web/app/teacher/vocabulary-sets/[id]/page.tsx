"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookPlus,
  Loader2,
  PackagePlus,
  Pencil,
  Power,
  Trash2,
  X,
} from "lucide-react";
import {
  CEFR_OPTIONS,
  POS_OPTIONS,
  api,
  type VocabularyListItem,
} from "@/lib/api";
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

export default function VocabularySetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const setId = Number(params.id);
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: set, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocabulary-set", setId],
    queryFn: () => api.getVocabularySet(setId),
    enabled: !isNaN(setId),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      api.updateVocabularySet(setId, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-set", setId] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-sets"] });
      setEditOpen(false);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      api.updateVocabularySet(setId, { isActive: !set?.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-set", setId] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (senseId: number) => api.removeSetItem(setId, senseId),
    onSuccess: (result) => {
      queryClient.setQueryData(["vocabulary-set", setId], (old: unknown) =>
        old
          ? {
              ...(old as Record<string, unknown>),
              itemCount: result.itemCount,
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: ["vocabulary-set", setId] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-sets"] });
    },
  });

  function openEdit() {
    setName(set?.name ?? "");
    setDescription(set?.description ?? "");
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !set) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/teacher/vocabulary-sets")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to sets
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Vocabulary set not found</p>
            <p className="text-sm text-muted-foreground">
              The set may have been deleted or the id is invalid.
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/teacher/vocabulary-sets")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Vocabulary sets
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{set.name}</h1>
            <Badge variant={set.isActive ? "outline" : "secondary"}>
              {set.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {set.description ?? "No description"} · {set.itemCount} items
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            <Power className="mr-2 size-4" />
            {set.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <PackagePlus className="mr-2 size-4" />
            Add senses
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            Senses in this set
            <span className="text-sm font-normal text-muted-foreground">
              {set.itemCount} senses
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {set.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This set is empty. Use “Add senses” to build the word list.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lemma</TableHead>
                  <TableHead className="hidden md:table-cell">POS</TableHead>
                  <TableHead className="hidden md:table-cell">CEFR</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Definition
                  </TableHead>
                  <TableHead>Polish</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {set.items.map((item) => (
                  <TableRow key={item.senseId}>
                    <TableCell>
                      <div className="font-medium">
                        {item.lemma}
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{item.senseId}
                        </span>
                      </div>
                      {item.categories.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.categories.map((c) => (
                            <Badge key={c.code} variant="outline">
                              {c.code}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs">{item.partOfSpeech}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.cefrLevels.length > 0
                        ? item.cefrLevels.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-lg lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {item.definition}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <span className="text-xs">
                        {item.translations
                          .map((t) => t.text)
                          .join(", ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          !set.isActive || removeItemMutation.isPending
                        }
                        onClick={() => removeItemMutation.mutate(item.senseId)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditSetDialog
        open={editOpen}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        onOpenChange={setEditOpen}
        onSubmit={() => editMutation.mutate()}
        isPending={editMutation.isPending}
      />

      <AddSensesDialog
        setId={setId}
        isActive={set.isActive}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}

function EditSetDialog({
  open,
  name,
  setName,
  description,
  setDescription,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(openFlag) => {
        if (!openFlag && !isPending) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5" />
            Edit set
          </DialogTitle>
          <DialogDescription>
            Update the name and description of the set.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
        </div>
        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSensesDialog({
  setId,
  isActive,
  open,
  onOpenChange,
}: {
  setId: number;
  isActive: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState("all");
  const [cefr, setCefr] = useState("all");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "set-builder-search",
      setId,
      { search, pos, cefr, category, page },
    ],
    queryFn: () =>
      api.listVocabulary({
        page,
        limit: 10,
        search: search || undefined,
        partOfSpeech: pos === "all" ? undefined : pos,
        cefr: cefr === "all" ? undefined : cefr,
        category: category || undefined,
        sort: "lemma",
      }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  const addMutation = useMutation({
    mutationFn: () => api.addSetItems(setId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-set", setId] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-sets"] });
      onOpenChange(false);
      setSelected([]);
      setSearch("");
      setPage(1);
    },
  });

  function toggle(senseId: number) {
    setSelected((prev) =>
      prev.includes(senseId)
        ? prev.filter((id) => id !== senseId)
        : [...prev, senseId],
    );
  }

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(openFlag) => {
        if (!openFlag && !addMutation.isPending) {
          onOpenChange(false);
          setSelected([]);
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="size-5" />
            Add senses to set
          </DialogTitle>
          <DialogDescription>
            Search the vocabulary database and select senses to include in this
            set.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <VocabSearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <Select
            value={pos}
            onValueChange={(v) => {
              setPos(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="POS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any POS</SelectItem>
              {POS_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cefr}
            onValueChange={(v) => {
              setCefr(v);
              setPage(1);
            }}
          >
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
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            placeholder="Category code/name…"
          />
        </div>

        <div className="min-h-24">
          {isLoading && !data ? (
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
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No senses match the current filters.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((sense) => (
                <SensePickRow
                  key={sense.id}
                  sense={sense}
                  checked={selected.includes(sense.id)}
                  onToggle={() => toggle(sense.id)}
                />
              ))}
            </div>
          )}
        </div>

        {(data?.meta.totalPages ?? 0) > 1 ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {data?.meta.page ?? page} of {data?.meta.totalPages ?? 0} ·{" "}
              {data?.meta.total ?? 0} results
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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            {selected.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={!isActive || selected.length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Add {selected.length > 0 ? `${selected.length} senses` : "senses"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SensePickRow({
  sense,
  checked,
  onToggle,
}: {
  sense: VocabularyListItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{sense.lemma}</span>
          <span className="text-xs text-muted-foreground">
            {sense.partOfSpeech}
          </span>
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
        variant={checked ? "default" : "outline"}
        onClick={onToggle}
        className="shrink-0"
      >
        {checked ? <X className="size-4" /> : <PackagePlus className="size-4" />}
        {checked ? "Selected" : "Select"}
      </Button>
    </div>
  );
}