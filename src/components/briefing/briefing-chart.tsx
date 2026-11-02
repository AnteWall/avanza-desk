import { useSuspenseQuery } from "@tanstack/react-query";

import { PriceChart } from "@/components/common/price-chart";
import { portfolioRangeQuery } from "@/lib/avanza/queries";
import { formatPercent } from "@/lib/format";

// The return series is in percent units.
const formatReturn = (v: number) => formatPercent(v / 100);

/** Your return, all accounts, from the last visit's day to today. Suspends. */
export function BriefingChart({ from, to }: { from: string; to: string }) {
  const { data } = useSuspenseQuery(portfolioRangeQuery({ from, to }));
  if (data.relativeSeries.length < 2) return null;
  return (
    <div className="h-40">
      <PriceChart
        points={data.relativeSeries.map((p) => ({
          timestamp: p.timestamp,
          value: p.performance.value,
        }))}
        intraday={false}
        formatValue={formatReturn}
        valueLabel="Return"
        previousClose={0}
      />
    </div>
  );
}
