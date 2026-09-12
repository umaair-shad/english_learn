"use client";

import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type StudentStateSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className={`text-2xl font-semibold tabular-nums ${tone ?? ""}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export function LearningSummaryCards({
  studentId,
}: {
  studentId: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-vocab-summary", studentId],
    queryFn: () => api.studentVocabularySummary(studentId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const s = (data ?? {}) as Partial<StudentStateSummary>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Learning" value={s.learning ?? 0} />
        <StatCard label="Reviewing" value={s.reviewing ?? 0} tone="text-violet-600" />
        <StatCard
          label="Mastered"
          value={s.mastered ?? 0}
          tone="text-emerald-600"
        />
        <StatCard label="Due now" value={s.dueNow ?? 0} tone="text-amber-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Assigned" value={s.assigned ?? 0} />
        <StatCard label="Encountered" value={s.encountered ?? 0} />
        <StatCard label="Due tomorrow" value={s.dueTomorrow ?? 0} />
        <StatCard label="Difficult" value={s.difficult ?? 0} tone="text-rose-600" />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <StatCard label="Total in space" value={s.total ?? 0} />
      </div>
    </div>
  );
}

export function VocabSearchInput({
  value,
  onChange,
  placeholder = "Search lemma, definition or Polish translation…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}