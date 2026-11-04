import { cn } from "cn";

import { InfoTip } from "@/components/common/info-tip";

/** Label-over-value stats beside the instrument title. */
export function StatList({
  stats,
}: {
  /** `text` drops the mono numeral style for word values like names. */
  stats: { label: string; value: string; text?: boolean; className?: string; tip?: string }[];
}) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-muted-foreground flex items-center gap-1 text-xs">
            {stat.label}
            {stat.tip && <InfoTip label={stat.label.toLowerCase()}>{stat.tip}</InfoTip>}
          </dt>
          <dd className={cn("font-medium", !stat.text && "num", stat.className)}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
