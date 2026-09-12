import { Badge } from "@/components/ui/badge";
import type { LearningStatus } from "@/lib/api";

const STATUS_TONE: Record<LearningStatus, string> = {
  ASSIGNED: "bg-stone-100 text-stone-800 dark:bg-stone-800/60 dark:text-stone-200",
  ENCOUNTERED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  LEARNING: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  REVIEWING:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  MASTERED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

export function LearningStatusBadge({ status }: { status: LearningStatus }) {
  return (
    <Badge className={STATUS_TONE[status] ?? undefined}>{status}</Badge>
  );
}