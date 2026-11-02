import { WeightBar } from "@/components/rebalance/weight-bar";
import { formatShare } from "@/lib/format";

export type RiskShare = { name: string; weight: number; before: number; after: number };

/**
 * Each instrument's share of the money and of the risk after the orders, with today's risk share
 * as the bar and the planned one as the tick: a holding taking far more risk than money stands out.
 * Kept in plan order with fixed columns, so editing a target doesn't reshuffle or resize it.
 */
export function RiskShares({ items }: { items: readonly RiskShare[] }) {
  const shown = items.filter((r) => r.before || r.after);
  const scale = Math.max(...shown.flatMap((r) => [r.before, r.after]));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_9rem_7rem] items-center gap-x-6 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">Instrument</span>
      <span className="text-muted-foreground text-right">Money</span>
      <span className="text-muted-foreground text-right">Risk today → after</span>
      <span />
      {shown.map((r) => (
        <div key={r.name} className="contents">
          <span className="truncate font-medium">{r.name}</span>
          <span className="num text-right">{formatShare(r.weight)}</span>
          <span className="num text-right">
            <span className="text-muted-foreground">{formatShare(r.before)} → </span>
            {formatShare(r.after)}
          </span>
          <WeightBar weight={Math.max(r.before, 0)} target={Math.max(r.after, 0)} scale={scale} />
        </div>
      ))}
    </div>
  );
}
