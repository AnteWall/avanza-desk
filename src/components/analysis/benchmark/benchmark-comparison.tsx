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

const points = (series: readonly { timestamp: number; performance: { value: number } }[]) =>
  rebase(series.map((p) => ({ timestamp: p.timestamp, value: p.performance.value })));

const isOmxs30 = (name: string) => /OMXS30|OMX Stockholm 30/i.test(name);

const periodWords: Partial<Record<PerformancePeriod, string>> = {
  ONE_YEAR: "the last year",
  THREE_YEARS: "the last 3 years",
  FIVE_YEARS: "the last 5 years",
  ALL_TIME: "all time",
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
  const indexName = index?.link.shortLinkDisplay || index?.link.linkDisplay || "Index";

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
          {Math.abs(ahead) < 1 ? (
            <>
              You're level with {indexName} over {periodWords[period] ?? "this period"}.
            </>
          ) : (
            <>
              You're{" "}
              <span className={cn("num sensitive", ahead > 0 ? "text-up" : "text-down")}>
                {formatInteger(Math.abs(ahead))} SEK
              </span>{" "}
              {ahead > 0 ? "ahead of" : "behind"} {indexName} over{" "}
              {periodWords[period] ?? "this period"}.
            </>
          )}
          <span className="text-muted-foreground block text-sm font-normal">
            That's compared with putting the same deposits into the index on the same days.
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {indices.indexes.length > 1 && (
          <Segmented
            label="Benchmark index"
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
          Average Avanza customer
        </label>
      </div>
      <BenchmarkChart
        series={[
          // The optional line goes last, so the others keep their colors when it toggles.
          { label: "You", points: yours },
          { label: indexName, points: indexSeries },
          ...(withAverage
            ? [{ label: "Average Avanza customer", points: points(average.relativeSeries) }]
            : []),
        ]}
      />
      <StatList
        stats={[
          { label: "Your value", value: formatInteger(actual), sensitive: true },
          {
            label: `Same money into ${indexName}`,
            value: simulated == null ? "–" : formatInteger(simulated),
            sensitive: true,
            note: simulated != null && (
              <>
                You <SignedAmount value={actual - simulated} className="sensitive" /> SEK
              </>
            ),
          },
          {
            label: "Your yearly return",
            value: mwr == null ? "–" : <Change ratio={mwr} />,
            note: "per year, this period",
            tip: "How much your money grew per year over this period, counting when you deposited and withdrew (money-weighted return).",
          },
          {
            label: "Yearly return, all time",
            tip: "Your average growth per year since you started at Avanza, as Avanza calculates it (CAGR).",
            // Avanza sends percent units.
            value: <Change ratio={ratios.compoundAnnualGrowthRate.value / 100} />,
            note: "per year, all time",
          },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        Same money: your value at the start and every deposit and withdrawal since, bought into or
        sold out of the index on its day. Indices exclude fees and, unless total return, dividends.
      </p>
    </div>
  );
}
