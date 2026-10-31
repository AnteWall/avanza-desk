import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { IncomeChart } from "@/components/analysis/income/income-chart";
import { IncomeTable } from "@/components/analysis/income/income-table";
import { Empty } from "@/components/common/empty";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { paidDividendsQuery, upcomingDividendsQuery } from "@/lib/avanza/queries";
import { formatInteger, formatShare } from "@/lib/format";
import { forecastIncome } from "@/lib/income";
import { stockholmDay } from "@/lib/snapshots";

/**
 * The next 12 months of dividends for what you hold now: announced payouts, plus last year's
 * repeated where nothing is announced yet. Totals, a monthly chart, then one row per holding.
 */
export function IncomeForecast() {
  const { holdings } = useHoldings();
  const { data: upcoming } = useSuspenseQuery(upcomingDividendsQuery);
  const { data: paid } = useSuspenseQuery(paidDividendsQuery);
  const { months, rows } = useMemo(
    () => forecastIncome(holdings, upcoming, paid, stockholmDay()),
    [holdings, upcoming, paid],
  );

  if (rows.length === 0) return <Empty>No dividends paid or announced on your holdings.</Empty>;
  const announced = rows.reduce((s, r) => s + r.announced, 0);
  const total = rows.reduce((s, r) => s + r.income, 0);
  const value = holdings.reduce((s, h) => s + h.value, 0);
  const stats = [
    { label: "Next 12 months", value: `${formatInteger(total)} SEK`, sensitive: true },
    { label: "Announced", value: `${formatInteger(announced)} SEK`, sensitive: true },
    { label: "Estimated", value: `${formatInteger(total - announced)} SEK`, sensitive: true },
    { label: "Per month", value: `${formatInteger(total / 12)} SEK`, sensitive: true },
    { label: "Portfolio yield", value: value > 0 ? formatShare(total / value) : "–" },
  ];

  return (
    <div className="flex flex-col">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-b p-3">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-muted-foreground text-xs">{s.label}</dt>
            <dd className={s.sensitive ? "sensitive num font-medium" : "num font-medium"}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="sensitive border-b p-3">
        <IncomeChart months={months} />
      </div>
      <IncomeTable rows={rows} />
    </div>
  );
}
