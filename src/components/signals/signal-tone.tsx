import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { Signal } from "@/lib/signals";

/** A signal's direction as a small up/down/flat arrow in the up/down colors. */
export function SignalTone({ tone }: { tone: Signal["tone"] }) {
  if (tone === "up")
    return <ArrowUpRight className="text-up size-3.5 shrink-0" aria-label="Positive" />;
  if (tone === "down")
    return <ArrowDownRight className="text-down size-3.5 shrink-0" aria-label="Negative" />;
  return <Minus className="text-muted-foreground size-3.5 shrink-0" aria-label="Neutral" />;
}
