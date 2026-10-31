import { cn } from "cn";
import type { ReactNode } from "react";

export type Stat = { label: string; value: ReactNode; note?: ReactNode; sensitive?: boolean };

/** Label-over-value stats in a grid that widens with the panel (needs an `@container` parent). */
export function StatList({ stats }: { stats: readonly Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @2xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="min-w-0">
          <dt className="text-muted-foreground text-xs">{s.label}</dt>
          <dd className={cn("num text-base font-medium", s.sensitive && "sensitive")}>{s.value}</dd>
          {s.note && <dd className="text-muted-foreground text-xs">{s.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
