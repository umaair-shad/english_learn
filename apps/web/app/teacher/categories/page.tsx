"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, Tags } from "lucide-react";
import { api, type VocabularyCategory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type TreeNode = VocabularyCategory & { children: TreeNode[] };

function buildTree(rows: VocabularyCategory[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function parentName(
  row: VocabularyCategory,
  byId: Map<number, VocabularyCategory>,
): string | null {
  if (!row.parentId) return null;
  return byId.get(row.parentId)?.name ?? null;
}

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vocabulary-categories"],
    queryFn: () => api.listVocabularyCategories(),
  });

  const byId = useMemo(() => {
    const map = new Map<number, VocabularyCategory>();
    for (const row of data ?? []) map.set(row.id, row);
    return map;
  }, [data]);

  const tree = useMemo(() => buildTree(data ?? []), [data]);
  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    return (data ?? []).filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query),
    );
  }, [data, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Hierarchical taxonomy used to classify vocabulary senses. Open a
          category to browse matching words.
        </p>
      </div>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Could not load categories.</p>
      ) : query ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="size-4 text-muted-foreground" />
              {matches.length} matching {matches.length === 1 ? "category" : "categories"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories match that search.</p>
            ) : (
              matches.map((row) => (
                <CategoryLink
                  key={row.id}
                  row={row}
                  parent={parentName(row, byId)}
                />
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {data.length.toLocaleString()} categories in the catalog.
          </p>
          {tree.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <Link
                    href={`/teacher/vocabulary?category=${encodeURIComponent(domain.code)}`}
                    className="hover:underline"
                  >
                    {domain.name}
                  </Link>
                  <Badge variant="secondary">{countLeaves(domain)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {domain.children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subcategories.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {domain.children.map((child) => (
                      <div key={child.id} className="space-y-1">
                        <CategoryLink row={child} />
                        {child.children.map((leaf) => (
                          <CategoryLink key={leaf.id} row={leaf} nested />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function countLeaves(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function CategoryLink({
  row,
  parent,
  nested,
}: {
  row: VocabularyCategory;
  parent?: string | null;
  nested?: boolean;
}) {
  return (
    <Link
      href={`/teacher/vocabulary?category=${encodeURIComponent(row.code)}`}
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
        nested ? "pl-5 text-muted-foreground" : "font-medium"
      }`}
    >
      <span className="truncate">
        {parent ? `${parent} / ` : ""}
        {row.name}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
