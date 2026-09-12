import type { ActivityType } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const TYPE_STYLES: Record<ActivityType, string> = {
  FLASHCARDS: "bg-violet-100 text-violet-700 border-violet-200",
  MEMORY: "bg-amber-100 text-amber-700 border-amber-200",
  QUIZ: "bg-sky-100 text-sky-700 border-sky-200",
  FILL_BLANK: "bg-rose-100 text-rose-700 border-rose-200",
};

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  return (
    <Badge variant="outline" className={TYPE_STYLES[type]}>
      {type}
    </Badge>
  );
}