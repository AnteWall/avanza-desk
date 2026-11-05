import { cn } from "cn";

import { formatPercent } from "@/lib/format";

/** A signed percentage change, colored up (blue) / down (red) / flat (muted). `badge` adds a tinted pill. */
export function Change({
  ratio,
  badge,
  className,
}: {
  ratio: number;
  badge?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num",
        0 < ratio && "text-up",
        ratio < 0 && "text-down",
        ratio === 0 && "text-muted-foreground",
        badge && "rounded-sm px-1.5 py-0.5 font-medium",
        badge && 0 < ratio && "bg-up/15",
        badge && ratio < 0 && "bg-down/15",
        badge && ratio === 0 && "bg-muted",
        className,
      )}
    >
      {formatPercent(ratio)}
    </span>
  );
}
