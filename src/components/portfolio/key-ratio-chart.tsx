import { useSuspenseQuery } from "@tanstack/react-query";

import { PriceChart } from "@/components/common/price-chart";
import { keyRatioHistoryQuery } from "@/lib/avanza/queries";
import { formatDecimal, formatPercent, formatShare } from "@/lib/format";

/** The ratios Avanza keeps history for, as in Key figures (percentages in percent units). */
export const keyRatios = [
  { value: "sharpeRatios", label: "Sharpe", format: formatDecimal },
  { value: "standardDeviations", label: "Volatility", format: (v: number) => formatShare(v / 100) },
  {
    value: "compoundAnnualGrowthRates",
    label: "CAGR",
    format: (v: number) => formatPercent(v / 100),
  },
] as const;

export type KeyRatio = (typeof keyRatios)[number]["value"];

/** One of the portfolio's key ratios over time, over all accounts. */
export function KeyRatioChart({ ratio }: { ratio: KeyRatio }) {
  const { data } = useSuspenseQuery(keyRatioHistoryQuery);
  const { label, format } = keyRatios.find((k) => k.value === ratio)!;
  const points = data[ratio];
  if (points.length === 0)
    return <p className="text-muted-foreground">No key ratio history yet.</p>;
  return (
    <PriceChart
      points={points}
      intraday={false}
      formatValue={format}
      valueLabel={label}
      // Zero is the line that matters for return-based ratios; volatility never crosses it.
      previousClose={ratio === "standardDeviations" ? undefined : 0}
    />
  );
}
