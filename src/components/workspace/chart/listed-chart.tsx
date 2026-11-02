import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "avanza-ts";
import { useMemo } from "react";

import { PriceChart, type TradeMarker } from "@/components/common/price-chart";
import { useMarketOpen } from "@/components/workspace/use-focused-instrument";
import { OrderSide, TransactionSide } from "@/lib/avanza/codes";
import type { Instrument } from "@/lib/avanza/instrument";
import { holding } from "@/lib/avanza/portfolio";
import {
  companyEventsQuery,
  positionsQuery,
  priceChartQuery,
  tradesByIsinQuery,
} from "@/lib/avanza/queries";

/** Price chart with volume, company events, the user's average price and own buys/sells. */
export function ListedChart({
  instrument,
  period,
}: {
  instrument: Instrument;
  period: ChartPeriod;
}) {
  const live = useMarketOpen({ id: instrument.orderbookId });
  const { data: chart } = useSuspenseQuery(priceChartQuery(instrument.orderbookId, period, live));
  // Overlays are decorations: if they fail the chart still shows.
  const { data: positions } = useQuery(positionsQuery);
  const { data: transactions } = useQuery(tradesByIsinQuery(instrument.isin));
  const { data: events } = useQuery(companyEventsQuery(instrument.orderbookId, period));

  const trades: TradeMarker[] = (transactions?.transactions ?? []).flatMap((t) =>
    t.priceInTradedCurrency && !t.cancelled
      ? [
          {
            timestamp: Date.parse(t.tradeDate ?? t.date),
            price: t.priceInTradedCurrency.value,
            side: t.type === TransactionSide.Sell ? OrderSide.Sell : OrderSide.Buy,
          },
        ]
      : [],
  );

  // Memoized: new arrays would redefine the chart on every render.
  const volumes = useMemo(
    () => chart.ohlc.map((p) => ({ timestamp: p.timestamp, volume: p.totalVolumeTraded })),
    [chart],
  );
  const eventTimes = useMemo(() => events?.map((e) => e.timestamp), [events]);

  if (chart.ohlc.length === 0)
    return <p className="text-muted-foreground">No trades in this period.</p>;
  return (
    <PriceChart
      points={chart.ohlc.map((p) => ({ timestamp: p.timestamp, value: p.close }))}
      intraday={period === "today"}
      previousClose={period === "today" ? chart.previousClosingPrice : null}
      averagePrice={holding(positions, instrument.orderbookId)?.averagePrice}
      trades={trades}
      volumes={volumes}
      events={eventTimes}
    />
  );
}
