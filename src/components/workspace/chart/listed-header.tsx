import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { Flash } from "@/components/common/flash";
import { InstrumentTitle } from "@/components/workspace/chart/instrument-title";
import { StatList } from "@/components/workspace/chart/stat-list";
import type { Instrument } from "@/lib/avanza/instrument";
import { holding } from "@/lib/avanza/portfolio";
import { positionsQuery, quoteQuery } from "@/lib/avanza/queries";
import { formatCompact, formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const price = (v: number | null | undefined) => (v == null ? "–" : formatPrice(v));

/** Live quote header for exchange-traded instruments (stocks, ETFs, certificates, …). */
export function ListedHeader({ instrument }: { instrument: Instrument }) {
  const { data: quote } = useSuspenseQuery(quoteQuery(instrument.orderbookId));
  const { data: positions } = useQuery(positionsQuery);
  const held = holding(positions, instrument.orderbookId);
  const yourReturn = held && quote.last ? quote.last / held.averagePrice - 1 : null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <InstrumentTitle instrument={instrument}>
        <Flash value={quote.last} className="num -mx-1 px-1 text-3xl font-semibold">
          {price(quote.last)}
        </Flash>
        {/* Avanza sends percent units; Change takes a ratio. */}
        {quote.changePercent != null && <Change ratio={quote.changePercent / 100} badge />}
        {!quote.isRealTime && (
          <span className="text-muted-foreground text-xs">{m.workspace.chart.delayed}</span>
        )}
        {yourReturn != null && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            {m.workspace.chart.yourReturn} <Change ratio={yourReturn} />
          </span>
        )}
      </InstrumentTitle>
      <StatList
        stats={[
          { label: m.common.high, value: price(quote.highest) },
          { label: m.common.low, value: price(quote.lowest) },
          {
            label: m.workspace.chart.avgPrice,
            value: price(quote.volumeWeightedAveragePrice),
            tip: m.workspace.chart.avgPriceTip,
          },
          {
            label: m.common.volume,
            tip: m.workspace.chart.volumeTip,
            value: quote.totalVolumeTraded == null ? "–" : formatInteger(quote.totalVolumeTraded),
          },
          {
            label: m.common.turnover,
            tip: m.workspace.chart.turnoverTip,
            value: quote.totalValueTraded == null ? "–" : formatCompact(quote.totalValueTraded),
          },
          ...(held
            ? [
                { label: m.workspace.chart.youOwn, value: formatInteger(held.volume) },
                { label: m.workspace.chart.yourAvg, value: formatPrice(held.averagePrice) },
              ]
            : []),
        ]}
      />
    </div>
  );
}
