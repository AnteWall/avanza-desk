import { Change } from "@/components/common/change";
import { InstrumentTitle } from "@/components/workspace/chart/instrument-title";
import { StatList } from "@/components/workspace/chart/stat-list";
import type { Instrument } from "@/lib/avanza/instrument";
import { formatPercent, formatPrice } from "@/lib/format";

// Fund guide values are percent units (1.23 = 1.23 %).
const pct = (v: number | null | undefined) => (v == null ? "–" : formatPercent(v / 100));

/** Header for funds: NAV priced once a day, development and fees instead of a live quote. */
export function FundHeader({ instrument }: { instrument: Instrument }) {
  const fund = instrument.fund!;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <InstrumentTitle instrument={instrument}>
        <span className="num text-3xl font-semibold">{formatPrice(fund.nav)}</span>
        {fund.developmentOneDay != null && <Change ratio={fund.developmentOneDay / 100} badge />}
        <span className="text-muted-foreground text-xs">NAV {fund.navDate.slice(0, 10)}</span>
      </InstrumentTitle>
      <StatList
        stats={[
          { label: "1M", value: pct(fund.developmentOneMonth) },
          { label: "YTD", value: pct(fund.developmentThisYear) },
          { label: "1Y", value: pct(fund.developmentOneYear) },
          { label: "3Y", value: pct(fund.developmentThreeYears) },
          { label: "Fee", value: pct(fund.productFee) },
          { label: "Risk", value: `${fund.risk} / 7` },
        ]}
      />
    </div>
  );
}
