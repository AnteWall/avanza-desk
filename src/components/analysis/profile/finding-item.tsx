import { cn } from "cn";
import { ChevronRight } from "lucide-react";

import { ToneLabel } from "@/components/analysis/profile/tone-label";
import { TrendLabel } from "@/components/analysis/profile/trend-label";
import { SignedAmount } from "@/components/common/signed-amount";
import { statusLabel, type Finding } from "@/lib/trading-profile";

/** One check in the pattern list: its verdict, trend and what it cost or made; opens its details. */
export function FindingItem({
  finding,
  selected,
  onSelect,
}: {
  finding: Finding;
  selected: boolean;
  onSelect: () => void;
}) {
  const found = finding.status === "found";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="group hover:bg-muted/60 aria-pressed:bg-accent focus-visible:bg-muted flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none aria-pressed:shadow-[inset_2px_0_0_var(--brand)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("font-medium", !found && "text-muted-foreground")}>
          {finding.title}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {finding.advice ? <ToneLabel tone={finding.advice.tone} /> : statusLabel[finding.status]}
          {finding.trend && finding.trend.direction !== "steady" && (
            <>
              <span aria-hidden>·</span>
              <TrendLabel direction={finding.trend.direction} />
            </>
          )}
        </span>
      </div>
      {finding.impact != null && (
        <SignedAmount value={finding.impact} className="sensitive shrink-0 text-xs" />
      )}
      <ChevronRight
        className="text-muted-foreground group-hover:text-foreground group-aria-pressed:text-brand size-4 shrink-0"
        aria-hidden
      />
    </button>
  );
}
