"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_LIMITS, type PageLimit } from "@/lib/use-page-limit";

export function ListPagination({
  page,
  limit,
  total,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
  onLimitChange,
  disabled,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: PageLimit) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(totalPages, total === 0 ? 0 : 1);
  const canPrev = hasPrev ?? page > 1;
  const canNext = hasNext ?? (pages > 0 && page < pages);
  const [jump, setJump] = useState("");

  function goJump() {
    const n = Number(jump);
    if (!Number.isInteger(n)) return;
    const next = Math.min(Math.max(1, n), Math.max(pages, 1));
    onPageChange(next);
    setJump("");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {total.toLocaleString()} items · page {page} of {Math.max(pages, 1)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(limit)}
          onValueChange={(v) => onLimitChange(Number(v) as PageLimit)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[7.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_LIMITS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            goJump();
          }}
        >
          <Input
            className="h-8 w-16"
            inputMode="numeric"
            placeholder="Go"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            disabled={disabled}
            aria-label="Go to page"
          />
          <Button type="submit" variant="ghost" size="sm" disabled={disabled}>
            Go
          </Button>
        </form>
      </div>
    </div>
  );
}
