import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "avanza-ts";
import { Bell } from "lucide-react";
import { useMemo } from "react";

import { PriceChart, type OverlayLine, type TradeMarker } from "@/components/common/price-chart";
import { Button } from "@/components/ui/button";
import { ChartControls } from "@/components/workspace/chart/chart-controls";
import { IndicatorPane } from "@/components/workspace/chart/indicator-pane";
import { useChartView } from "@/components/workspace/chart/use-chart-view";
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
import { overlayLabels, type Overlay } from "@/lib/chart-view";
import { m } from "@/lib/i18n";
import { ema, sma, vwap } from "@/lib/indicators";
import { openRuleDialog } from "@/lib/rule-dialog";

const overlayColor: Record<Overlay, string> = {
  sma20: "var(--chart-2)",
  sma50: "var(--chart-3)",
  ema20: "var(--chart-5)",
  vwap: "var(--muted-foreground)",
};

/**
 * Price chart with volume, company events, the user's average price and own buys/sells, as a
 * line or candles, with optional indicators over it and an RSI/MACD pane under it.
 */
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
  const view = useChartView();
  const intraday = period === "today";
  const overlays = useMemo((): OverlayLine[] => {
    const closes = chart.ohlc.map((p) => p.close);
    const series: Record<Overlay, () => (number | null)[]> = {
      sma20: () => sma(closes, 20),
      sma50: () => sma(closes, 50),
      ema20: () => ema(closes, 20),
      vwap: () => vwap(chart.ohlc),
    };
    return view.overlays
      .filter((o) => o !== "vwap" || intraday)
      .map((o) => ({
        key: o,
        label: overlayLabels[o],
        color: overlayColor[o],
        points: series[o]().flatMap((v, i) =>
          v == null ? [] : [{ timestamp: chart.ohlc[i]!.timestamp, value: v }],
        ),
      }));
  }, [chart, view.overlays, intraday]);
  const points = useMemo(
    () => chart.ohlc.map((p) => ({ timestamp: p.timestamp, value: p.close })),
    [chart],
  );

  const lower = view.lower === "none" ? undefined : view.lower;
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex justify-end gap-1">
        <Button
          variant="outline"
          size="xs"
          onClick={() =>
            openRuleDialog({
              kind: "price",
              target: { id: instrument.orderbookId, name: instrument.name },
            })
          }
        >
          <Bell />
          {m.workspace.chart.priceAlert}
        </Button>
        <ChartControls intraday={intraday} />
      </div>
      {chart.ohlc.length === 0 ? (
        <p className="text-muted-foreground">{m.workspace.chart.noTrades}</p>
      ) : (
        <>
          <div className="min-h-0 flex-[3]">
            <PriceChart
              points={points}
              intraday={intraday}
              previousClose={intraday ? chart.previousClosingPrice : null}
              averagePrice={holding(positions, instrument.orderbookId)?.averagePrice}
              trades={trades}
              volumes={volumes}
              events={eventTimes}
              candles={view.style === "candles" ? chart.ohlc : undefined}
              overlays={overlays}
              stacked={!!lower}
            />
          </div>
          {lower && (
            <div className="min-h-16 flex-1">
              <IndicatorPane bars={chart.ohlc} kind={lower} intraday={intraday} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
