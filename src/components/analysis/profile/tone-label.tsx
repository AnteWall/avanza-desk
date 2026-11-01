import { cn } from "cn";

import { toneLabel, type Tone } from "@/lib/trading-profile";

// Down/up colors carry the verdict: a habit that costs you, one that pays; warning to watch.
const toneClass: Record<Tone, string> = {
  change: "text-down",
  watch: "text-warning",
  keep: "text-up",
};

/** "Worth changing", "Keep an eye on it" or "Keep it up", colored by what it means. */
export function ToneLabel({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("font-medium", toneClass[tone], className)}>{toneLabel[tone]}</span>;
}
