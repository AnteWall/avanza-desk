import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { SignedAmount } from "@/components/common/signed-amount";
import { Kpi } from "@/components/portfolio/kpi";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { dividendYields, holdingYield } from "@/lib/avanza/portfolio";
import { stockKeyRatiosQuery, totalValuesQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice, formatShare } from "@/lib/format";

/**
 * The headline numbers in one row. Today's move is in the top bar, development per period in
 * the performance panel, and ratios under Key figures, so this stays scannable.
 */
export function PortfolioOverview() {
  const { data: totals } = useSuspenseQuery(totalValuesQuery);
  const { holdings } = useHoldings();
  const { data: stockRatios } = useQuery(stockKeyRatiosQuery);

  const total = totals.totalValue.totalValue.value;
  const invested = totals.totalValue.positionValue.value;
  const profit = holdings.reduce((s, h) => s + h.profit, 0);
  const cost = holdings.reduce((s, h) => s + h.cost, 0);
  const yields = stockRatios && dividendYields(stockRatios);
  const dividends =
    yields && holdings.reduce((s, h) => s + h.value * (holdingYield(h, yields) ?? 0), 0);

  return (
    <dl className="bg-card flex items-center gap-x-10 overflow-hidden rounded-md border px-4 py-2.5">
      <Kpi label="Total value" className="sensitive text-lg font-semibold">
        {formatPrice(total)} SEK
      </Kpi>
      <Kpi label="Invested" className="sensitive">
        {formatInteger(invested)}
      </Kpi>
      <Kpi
        label="Unrealized P/L"
        hint="Market value minus acquisition cost, over positions with a known cost"
      >
        <SignedAmount value={profit} className="sensitive" />
        {cost > 0 && <Change ratio={profit / cost} className="ml-2 text-xs" />}
      </Kpi>
      <Kpi label="Cash" className="sensitive">
        {formatInteger(total - invested)}
      </Kpi>
      <Kpi label="Dividends / yr" hint="Each stock's current dividend yield applied to its value">
        <span className="sensitive">{dividends == null ? "–" : formatInteger(dividends)}</span>
        {dividends != null && invested > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            {formatShare(dividends / invested)}
          </span>
        )}
      </Kpi>
    </dl>
  );
}
