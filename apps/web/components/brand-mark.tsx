import { cn } from "cn";

export function BrandMark({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl text-sm font-bold tracking-tight shadow-sm",
        light
          ? "bg-white/15 text-white ring-1 ring-white/25"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      EN
    </span>
  );
}
