import type { ActivityStatus, SessionStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<ActivityStatus | SessionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-sky-100 text-sky-700 border-sky-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  PAUSED: "bg-amber-100 text-amber-700 border-amber-200",
  FINISHED: "bg-sky-100 text-sky-700 border-sky-200",
  ABANDONED: "bg-red-100 text-red-700 border-red-200",
};

export function StatusBadge({
  status,
}: {
  status: ActivityStatus | SessionStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {status}
    </Badge>
  );
}

export function EventTypeBadge({ eventType }: { eventType: string }) {
  let className = "bg-gray-100 text-gray-700 border-gray-200";
  if (
    eventType === "ANSWER_CORRECT" ||
    eventType === "MATCH_FOUND" ||
    eventType === "FINISHED"
  ) {
    className = "bg-emerald-100 text-emerald-700 border-emerald-200";
  } else if (
    eventType === "ANSWER_INCORRECT" ||
    eventType === "MATCH_FAILED"
  ) {
    className = "bg-red-100 text-red-700 border-red-200";
  } else if (eventType === "PAUSED" || eventType === "RESUMED") {
    className = "bg-amber-100 text-amber-700 border-amber-200";
  } else if (eventType === "ANSWER_SUBMITTED") {
    className = "bg-sky-100 text-sky-700 border-sky-200";
  }
  return (
    <Badge variant="outline" className={className}>
      {eventType}
    </Badge>
  );
}