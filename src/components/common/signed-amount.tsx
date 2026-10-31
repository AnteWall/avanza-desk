import { cn } from "cn";

import { formatInteger } from "@/lib/format";

/** A signed SEK amount, colored up/down like `<Change>`: "+1 234". */
export function SignedAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "num",
        value > 0 && "text-up",
        value < 0 && "text-down",
        value === 0 && "text-muted-foreground",
        className,
      )}
    >
      {value > 0 && "+"}
      {formatInteger(value)}
    </span>
  );
}
