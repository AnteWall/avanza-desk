import { useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "avanza-ts";

import { PriceChart } from "@/components/common/price-chart";
import type { Instrument } from "@/lib/avanza/instrument";
import { fundChartQuery } from "@/lib/avanza/queries";
import { formatPercent } from "@/lib/format";

// The fund series is % development since the period start, in percent units.
const formatDevelopment = (v: number) => formatPercent(v / 100);

export function FundChart({ instrument, period }: { instrument: Instrument; period: ChartPeriod }) {
  const { data } = useSuspenseQuery(fundChartQuery(instrument.orderbookId, period));
  if (data.dataSerie.length === 0)
    return <p className="text-muted-foreground">No NAV history in this period.</p>;
  return (
    <PriceChart
      points={data.dataSerie.map((p) => ({ timestamp: p.x, value: p.y }))}
      intraday={false}
      formatValue={formatDevelopment}
      valueLabel="Development"
      previousClose={0}
    />
  );
}
