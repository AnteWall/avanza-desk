import { useQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import type { Instrument } from "@/lib/avanza/instrument";
import { quoteQuery } from "@/lib/avanza/queries";
import { periodReturns } from "@/lib/avanza/stock-details";
import { m } from "@/lib/i18n";

// Avanza's closing-price keys.
const periods = [
  { label: m.workspace.periods.w1, key: "oneWeek" },
  { label: m.workspace.periods.m1, key: "oneMonth" },
  { label: m.workspace.periods.m3, key: "threeMonths" },
  { label: m.workspace.periods.ytd, key: "startOfYear" },
  { label: m.workspace.periods.y1, key: "oneYear" },
  { label: m.workspace.periods.y3, key: "threeYears" },
  { label: m.workspace.periods.y5, key: "fiveYears" },
  { label: m.workspace.periods.y10, key: "tenYears" },
];

/** Return over each period up to the live price, so the trend reads without switching ranges. */
export function ReturnsStrip({ instrument }: { instrument: Instrument }) {
  const { data: quote } = useQuery(quoteQuery(instrument.orderbookId));
  if (!quote?.last || !instrument.closingPrices) return null;
  const returns = periodReturns(quote.last, instrument.closingPrices, periods);
  if (returns.length === 0) return null;
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 px-3 pb-3">
      {returns.map((r) => (
        <div key={r.label}>
          <dt className="text-muted-foreground num text-xs">{r.label}</dt>
          <dd className="font-medium">
            <Change ratio={r.ratio} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
