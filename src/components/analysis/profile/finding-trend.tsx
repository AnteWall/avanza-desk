import { MetricChart } from "@/components/analysis/profile/metric-chart";
import { TrendLabel } from "@/components/analysis/profile/trend-label";
import type { Finding } from "@/lib/trading-profile";

/** The check's one number: now against before, then per year next to it. */
export function FindingTrend({ finding }: { finding: Finding }) {
  const { metric, trend } = finding;
  return (
    <div className="grid gap-3 p-3 @3xl:grid-cols-[12rem_1fr]">
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-muted-foreground text-xs">{metric.label}</dt>
          <dd className="num text-2xl font-semibold">{trend?.recent ?? metric.text}</dd>
          <dd className="text-muted-foreground text-xs">
            {trend ? "last 12 months" : "all trades"}
          </dd>
        </div>
        {trend && (
          <div>
            <dt className="text-muted-foreground text-xs">Before</dt>
            <dd className="num font-medium">{trend.before}</dd>
            <dd className="text-xs">
              <TrendLabel direction={trend.direction} />
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground text-xs">Flagged</dt>
          <dd className="text-xs">{metric.cutoffText}</dd>
        </div>
      </dl>
      <div className="h-40">
        <MetricChart history={finding.history} metric={metric} />
      </div>
    </div>
  );
}
