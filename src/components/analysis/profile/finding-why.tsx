import { StatList } from "@/components/analysis/stat-list";
import type { Finding } from "@/lib/trading-profile";

/** What the check saw, the rule it applies, and every number it measured. */
export function FindingWhy({ finding }: { finding: Finding }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3 p-3">
      <p>{finding.detail}</p>
      <p className="text-muted-foreground text-xs">{finding.rule}</p>
      <StatList stats={finding.measures} />
    </div>
  );
}
