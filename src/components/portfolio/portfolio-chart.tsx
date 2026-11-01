import { useSuspenseQuery } from "@tanstack/react-query";
import type { PerformancePeriod } from "avanza-ts";

import { PriceChart } from "@/components/common/price-chart";
import { portfolioChartQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPercent } from "@/lib/format";

export type ChartMode = "return" | "value";

// The return series is in percent units.
const formatReturn = (v: number) => formatPercent(v / 100);

/** All accounts over `period`: return since the period start, or market value (incl. deposits). */
export function PortfolioChart({ period, mode }: { period: PerformancePeriod; mode: ChartMode }) {
  const { data } = useSuspenseQuery(portfolioChartQuery(period));
  const series = mode === "return" ? data.relativeSeries : data.valueSeries;
  if (series.length === 0)
    return <p className="text-muted-foreground">No history in this period.</p>;
  const chart = (
    <PriceChart
      points={series.map((p) => ({ timestamp: p.timestamp, value: p.performance.value }))}
      intraday={false}
      {...(mode === "return"
        ? { formatValue: formatReturn, valueLabel: "Return", previousClose: 0 }
        : { formatValue: formatInteger, valueLabel: "Value" })}
    />
  );
  // The value series is your money; the return series is only a percentage.
  return mode === "value" ? <div className="sensitive h-full">{chart}</div> : chart;
}
