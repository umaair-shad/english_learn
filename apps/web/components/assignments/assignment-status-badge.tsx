import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus } from "@/lib/api";

const STATUS_TONE: Record<AssignmentStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-800 dark:bg-stone-800/60 dark:text-stone-200",
  ASSIGNED:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  IN_PROGRESS:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  CANCELLED:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <Badge className={STATUS_TONE[status] ?? undefined}>
      {ASSIGNMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}