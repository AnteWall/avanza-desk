import { cn } from "cn";

/** Label-over-value stats beside the instrument title. */
export function StatList({
  stats,
}: {
  /** `text` drops the mono numeral style for word values like names. */
  stats: { label: string; value: string; text?: boolean; className?: string }[];
}) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-muted-foreground text-xs">{stat.label}</dt>
          <dd className={cn("font-medium", !stat.text && "num", stat.className)}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
