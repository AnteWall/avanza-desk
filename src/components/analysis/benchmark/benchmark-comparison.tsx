import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import type { PerformancePeriod } from "avanza-ts";
import { cn } from "cn";
import { useState } from "react";

import { BenchmarkChart } from "@/components/analysis/benchmark/benchmark-chart";
import { StatList } from "@/components/analysis/stat-list";
import { Change } from "@/components/common/change";
import { Segmented } from "@/components/common/segmented";
import { SignedAmount } from "@/components/common/signed-amount";
import { Switch } from "@/components/ui/switch";
import { accountIds } from "@/lib/account";
import {
  averageCustomerQuery,
  headerIndicesQuery,
  keyRatiosQuery,
  orderbookChartsQuery,
  portfolioChartQuery,
  transactionFilterQuery,
} from "@/lib/avanza/queries";
import { rebase, simulate, xirr, type CashFlow } from "@/lib/benchmark";
import { formatInteger } from "@/lib/format";
import { m } from "@/lib/i18n";

const points = (series: readonly { timestamp: number; performance: { value: number } }[]) =>
  rebase(series.map((p) => ({ timestamp: p.timestamp, value: p.performance.value })));

const isOmxs30 = (name: string) => /OMXS30|OMX Stockholm 30/i.test(name);

const periodWords: Partial<Record<PerformancePeriod, string>> = {
  ONE_YEAR: m.analysis.benchmark.periods.oneYear,
  THREE_YEARS: m.analysis.benchmark.periods.threeYears,
  FIVE_YEARS: m.analysis.benchmark.periods.fiveYears,
  ALL_TIME: m.analysis.benchmark.periods.all,
};

/**
 * Your return against an index and the average Avanza customer over `period`, plus the same
 * deposits put into the index and your money-weighted return.
 */
export function BenchmarkComparison({ period }: { period: PerformancePeriod }) {
  const [{ data: mine }, { data: indices }] = useSuspenseQueries({
    queries: [portfolioChartQuery(period), headerIndicesQuery],
  });
  const range = { from: mine.interval.from.slice(0, 10), to: mine.interval.to.slice(0, 10) };
  const [picked, setPicked] = useState<string>();
  const [withAverage, setWithAverage] = useState(false);
  const index =
    indices.indexes.find((i) => i.link.orderbookId === picked) ??
    indices.indexes.find((i) => isOmxs30(`${i.link.shortLinkDisplay} ${i.link.linkDisplay}`)) ??
    indices.indexes[0];
  const [{ data: average }, { data: flowTx }, { data: ratios }] = useSuspenseQueries({
    queries: [
      averageCustomerQuery(range),
      transactionFilterQuery({
        ...range,
        accountIds: accountIds(),
        transactionTypes: ["DEPOSIT", "WITHDRAW"],
      }),
      keyRatiosQuery,
    ],
  });
  // Decoration: the index line and the counterfactual appear once it loads.
  const { data: charts } = useQuery(
    orderbookChartsQuery(index ? [index.link.orderbookId] : [], range),
  );

  const yours = points(mine.relativeSeries);
  const indexSeries = points(charts?.[0]?.relativeSeries ?? []);
  const indexName = index?.link.shortLinkDisplay || index?.link.linkDisplay || m.common.index;
  const over = periodWords[period] ?? m.analysis.benchmark.periods.other;

  const start = mine.valueSeries[0];
  const end = mine.valueSeries.at(-1);
  const flows: CashFlow[] = flowTx.transactions
    .filter((t) => !t.cancelled && t.amount)
    .map((t) => ({
      date: Date.parse(t.date),
      amount: (t.type === "WITHDRAW" ? -1 : 1) * Math.abs(t.amount!.value),
    }));
  const invested: CashFlow[] = start
    ? [{ date: start.timestamp, amount: start.performance.value }, ...flows]
    : flows;
  const simulated = indexSeries.length ? simulate(invested, indexSeries) : null;
  const actual = end?.performance.value ?? 0;
  const mwr = end
    ? xirr([
        ...invested.map((f) => ({ date: f.date, amount: -f.amount })),
        { date: end.timestamp, amount: actual },
      ])
    : null;

  const ahead = simulated == null ? null : actual - simulated;

  return (
    <div className="flex flex-col gap-3">
      {/* The answer first, in a sentence; the chart and figures below back it up. */}
      {ahead != null && (
        <p className="text-xl leading-snug font-semibold text-balance">
          {Math.abs(ahead) < 1
            ? m.analysis.benchmark.level(indexName, over)
            : m.analysis.benchmark.ahead(
                <span
                  key="amount"
                  className={cn("num sensitive", ahead > 0 ? "text-up" : "text-down")}
                >
                  {formatInteger(Math.abs(ahead))} SEK
                </span>,
                ahead > 0,
                indexName,
                over,
              )}
          <span className="text-muted-foreground block text-sm font-normal">
            {m.analysis.benchmark.compared}
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {indices.indexes.length > 1 && (
          <Segmented
            label={m.analysis.benchmark.index}
            options={indices.indexes.map((i) => ({
              label: i.link.shortLinkDisplay || i.link.linkDisplay,
              value: i.link.orderbookId,
            }))}
            value={index?.link.orderbookId ?? ""}
            onChange={setPicked}
          />
        )}
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <Switch
            checked={withAverage}
            onCheckedChange={setWithAverage}
            className="data-checked:bg-brand"
          />
          {m.analysis.benchmark.average}
        </label>
      </div>
      <BenchmarkChart
        series={[
          // The optional line goes last, so the others keep their colors when it toggles.
          { label: m.analysis.benchmark.you, points: yours },
          { label: indexName, points: indexSeries },
          ...(withAverage
            ? [{ label: m.analysis.benchmark.average, points: points(average.relativeSeries) }]
            : []),
        ]}
      />
      <StatList
        stats={[
          { label: m.analysis.benchmark.yourValue, value: formatInteger(actual), sensitive: true },
          {
            label: m.analysis.benchmark.sameMoney(indexName),
            value: simulated == null ? "–" : formatInteger(simulated),
            sensitive: true,
            note:
              simulated != null &&
              m.analysis.benchmark.sameMoneyNote(
                <SignedAmount key="amount" value={actual - simulated} className="sensitive" />,
              ),
          },
          {
            label: m.analysis.benchmark.yearly,
            value: mwr == null ? "–" : <Change ratio={mwr} />,
            note: m.analysis.benchmark.yearlyNote,
            tip: m.analysis.benchmark.yearlyTip,
          },
          {
            label: m.analysis.benchmark.allTime,
            tip: m.analysis.benchmark.allTimeTip,
            // Avanza sends percent units.
            value: <Change ratio={ratios.compoundAnnualGrowthRate.value / 100} />,
            note: m.analysis.benchmark.allTimeNote,
          },
        ]}
      />
      <p className="text-muted-foreground text-xs">{m.analysis.benchmark.footnote}</p>
    </div>
  );
}
