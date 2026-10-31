import { cn } from "cn";

import type { RateLimit } from "@/lib/ai/types";
import { formatShare, formatTime } from "@/lib/format";

const windows: Record<string, string> = {
  five_hour: "5-hour",
  seven_day: "weekly",
  seven_day_opus: "weekly Opus",
};

/**
 * Your Claude plan's usage, shown only when it matters: close to the limit (from 80 %), or over
 * it with the time it resets.
 */
export function UsageNotice({ limit }: { limit: RateLimit }) {
  const blocked = limit.status === "rejected";
  const near = limit.status === "allowed_warning" || (limit.utilization ?? 0) >= 0.8;
  if (!blocked && !near) return null;
  const window = (limit.window && windows[limit.window]) ?? "usage";
  const resets = limit.resetsAt ? ` It resets at ${formatTime(limit.resetsAt * 1000)}.` : "";
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 border-t px-3 py-1.5 text-xs",
        blocked ? "text-destructive" : "text-warning",
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", blocked ? "bg-destructive" : "bg-warning")}
        aria-hidden
      />
      {blocked
        ? `You've reached your ${window} usage limit.${resets}`
        : `${formatShare(limit.utilization ?? 0.8)} of your ${window} usage limit used.${resets}`}
    </p>
  );
}
