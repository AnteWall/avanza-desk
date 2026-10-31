import { useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { SignedAmount } from "@/components/common/signed-amount";
import { StatList } from "@/components/workspace/chart/stat-list";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { yearSummaryQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPercent } from "@/lib/format";

/** One year in review: development against benchmarks, cash flows, best and worst. Suspends. */
export function YearSummary({ year }: { year: number }) {
  const { data } = useSuspenseQuery(yearSummaryQuery(year));
  const focus = useFocusInstrument();
  const { development: dev, performanceDto: perf } = data;
  // Avanza sends percent units.
  const pct = (value: number) => formatPercent(value / 100);

  const securities = (title: string, list: typeof dev.bestSecurities) => (
    <section className="flex flex-col gap-1">
      <h3 className="text-muted-foreground text-xs">{title}</h3>
      {list.map((s) => (
        <button
          key={s.orderbookId}
          type="button"
          onClick={() => focus(s.orderbookId)}
          className="hover:bg-muted/60 -mx-1 flex justify-between gap-4 rounded-sm px-1 text-left transition-colors"
        >
          <span className="truncate font-medium">{s.instrumentName}</span>
          <Change ratio={s.development / 100} />
        </button>
      ))}
    </section>
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      <StatList
        stats={[
          { label: "Return", value: pct(perf.performanceForPeriod) },
          { label: "Avanza customers", value: pct(perf.performanceAllCustomers) },
          { label: "OMXS30", value: pct(perf.performanceOMXS30) },
          { label: "Start value", value: formatInteger(dev.startValue), className: "sensitive" },
          { label: "End value", value: formatInteger(dev.currentValue), className: "sensitive" },
          { label: "Deposits", value: formatInteger(dev.totalDeposits), className: "sensitive" },
          { label: "Dividends", value: formatInteger(dev.totalDividends), className: "sensitive" },
          { label: "Fees", value: formatInteger(dev.totalOtherFees), className: "sensitive" },
          {
            label: "Transactions",
            value: formatInteger(data.numberOfTransactionsView.numberOfTransactions),
          },
        ]}
      />
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        {[
          { label: "Best day", day: perf.bestDay },
          { label: "Worst day", day: perf.worstDay },
        ].map(
          ({ label, day }) =>
            // A year with no history yet has no days.
            day?.day && (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">
                  {label} · <span className="num">{day.day}</span>
                </dt>
                <dd>
                  <span className="sensitive">
                    <SignedAmount value={day.performanceInCash} className="font-medium" /> SEK
                  </span>
                </dd>
              </div>
            ),
        )}
      </dl>
      <div className="grid grid-cols-2 gap-6">
        {securities("Best holdings", dev.bestSecurities)}
        {securities("Worst holdings", dev.worstSecurities)}
      </div>
    </div>
  );
}
