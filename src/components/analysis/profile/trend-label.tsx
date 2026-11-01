import { cn } from "cn";

import { directionLabel, type Direction } from "@/lib/trading-profile";

const directionClass: Record<Direction, string> = {
  better: "text-up",
  worse: "text-down",
  steady: "text-muted-foreground",
};

/** "Improving", "Getting worse" or "Steady": the last 12 months against before. */
export function TrendLabel({ direction, className }: { direction: Direction; className?: string }) {
  return (
    <span className={cn("font-medium", directionClass[direction], className)}>
      {directionLabel[direction]}
    </span>
  );
}
