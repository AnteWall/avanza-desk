import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { Flash } from "@/components/common/flash";
import { InstrumentTitle } from "@/components/workspace/chart/instrument-title";
import { StatList } from "@/components/workspace/chart/stat-list";
import type { Instrument } from "@/lib/avanza/instrument";
import { holding } from "@/lib/avanza/portfolio";
import { positionsQuery, quoteQuery } from "@/lib/avanza/queries";
import { formatCompact, formatInteger, formatPrice } from "@/lib/format";

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
        {!quote.isRealTime && <span className="text-muted-foreground text-xs">Delayed</span>}
        {yourReturn != null && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            Your return <Change ratio={yourReturn} />
          </span>
        )}
      </InstrumentTitle>
      <StatList
        stats={[
          { label: "High", value: price(quote.highest) },
          { label: "Low", value: price(quote.lowest) },
          {
            label: "Avg price",
            value: price(quote.volumeWeightedAveragePrice),
            tip: "The average price paid today, weighted by how many shares changed hands at each price (VWAP).",
          },
          {
            label: "Volume",
            tip: "How many shares changed hands today.",
            value: quote.totalVolumeTraded == null ? "–" : formatInteger(quote.totalVolumeTraded),
          },
          {
            label: "Turnover",
            tip: "The value of all shares traded today.",
            value: quote.totalValueTraded == null ? "–" : formatCompact(quote.totalValueTraded),
          },
          ...(held
            ? [
                { label: "You own", value: formatInteger(held.volume) },
                { label: "Your avg", value: formatPrice(held.averagePrice) },
              ]
            : []),
        ]}
      />
    </div>
  );
}
