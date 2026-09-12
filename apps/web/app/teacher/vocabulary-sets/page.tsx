"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, LibraryBig, Loader2, Plus, Eye } from "lucide-react";
import { api } from "@/lib/api";
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

export default function VocabularySetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vocabulary-sets", { search, isActive, page }],
    queryFn: () =>
      api.listVocabularySets({
        search: search || undefined,
        isActive: isActive === "all" ? undefined : isActive,
        page,
        limit: 10,
      }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createVocabularySet({
        name,
        description: description || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-sets"] });
      setCreateOpen(false);
      setName("");
      setDescription("");
      router.push(`/teacher/vocabulary-sets/${result.id}`);
    },
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
          <h1 className="text-2xl font-semibold">Vocabulary Sets</h1>
          <p className="text-sm text-muted-foreground">
            Reusable groups of senses that can be assigned to students.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          New set
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-5 text-muted-foreground" />
            Sets
            {data ? (
              <span className="text-sm font-normal text-muted-foreground">
                {data.meta.total} sets
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <VocabSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                resetPage();
              }}
              placeholder="Search sets…"
            />
            <Select
              value={isActive}
              onValueChange={(v) => {
                setIsActive(v);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sets</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
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
              Could not load vocabulary sets.{" "}
              <Button variant="link" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || isActive !== "all"
                ? "No sets match the current filters."
                : "No vocabulary sets yet. Create one to start building reusable word lists."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((set) => (
                  <TableRow key={set.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <LibraryBig className="size-4 text-muted-foreground" />
                        {set.name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-64 truncate md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {set.description ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {set.itemCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={set.isActive ? "outline" : "secondary"}
                      >
                        {set.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                      >
                        <a href={`/teacher/vocabulary-sets/${set.id}`}>
                          <Eye className="size-4" />
                        </a>
                      </Button>
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

      <Dialog
        open={createOpen}
        onOpenChange={(openFlag) => {
          setCreateOpen(openFlag);
          if (!openFlag) {
            setName("");
            setDescription("");
            createMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LibraryBig className="size-5" />
              New vocabulary set
            </DialogTitle>
            <DialogDescription>
              Give the set a name. You can add senses right after with the set
              builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="set-name">Name</Label>
              <Input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Banking & Finance"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-description">Description (optional)</Label>
              <textarea
                id="set-description"
                className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this set cover?"
              />
            </div>
            {createMutation.isError ? (
              <p className="text-sm text-destructive">
                Failed to create the set. Name is required.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Create set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}