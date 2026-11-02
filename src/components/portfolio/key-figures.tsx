import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Change } from "@/components/common/change";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { InstrumentType } from "@/lib/avanza/codes";
import { fundAnalysisQuery, keyRatiosQuery, totalValuesQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice, formatShare } from "@/lib/format";

const dash = "–";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div title={hint} className="border-border/60 flex h-8 items-center gap-3 border-b px-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num ml-auto min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  );
}

/**
 * Concentration, cost and risk of the whole portfolio. Avanza sends percentages in percent
 * units, hence the `/ 100`s.
 */
export function KeyFigures() {
  const { holdings } = useHoldings({ grouped: true });
  const { data: totals } = useSuspenseQuery(totalValuesQuery);
  // Decorations: each shows a dash until it loads, or if it fails.
  const { data: ratios } = useQuery(keyRatiosQuery);
  const { data: funds } = useQuery(fundAnalysisQuery);

  const invested = holdings.reduce((s, h) => s + h.value, 0);
  const share = (v: number) => (invested ? formatShare(v / invested) : dash);
  const top5 = holdings.slice(0, 5).reduce((s, h) => s + h.value, 0);
  const largest = holdings[0];
  const fundValue = holdings
    .filter((h) => h.type === InstrumentType.Fund)
    .reduce((s, h) => s + h.value, 0);
  const fundFee = funds && fundValue ? funds.averageProductFee / 100 : undefined;

  return (
    <dl className="grid grid-cols-2 gap-x-6">
      <Row label="Holdings">{holdings.length}</Row>
      <Row label="Largest">{largest ? `${largest.name} · ${share(largest.value)}` : dash}</Row>
      <Row label="Top 5 share">{share(top5)}</Row>
      <Row label="Buying power">
        <span className="sensitive">{formatInteger(totals.buyingPower.total.value)}</span>
      </Row>
      <Row
        label="Fund fees / yr"
        hint="Average ongoing charge of your funds, applied to their value"
      >
        {fundFee == null ? (
          dash
        ) : (
          <span className="sensitive">{`≈ ${formatInteger(fundValue * fundFee)} (${formatShare(fundFee)})`}</span>
        )}
      </Row>
      <Row label="CAGR" hint="Compound annual growth rate since the start">
        {ratios ? <Change ratio={ratios.compoundAnnualGrowthRate.value / 100} /> : dash}
      </Row>
      <Row label="Volatility" hint="Standard deviation of returns">
        {ratios ? formatShare(ratios.standardDeviation.value / 100) : dash}
      </Row>
      <Row label="Sharpe ratio">{ratios ? formatPrice(ratios.sharpeRatio.value) : dash}</Row>
    </dl>
  );
}
