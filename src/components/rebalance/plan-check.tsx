import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useState, type ReactNode } from "react";

import { BenchmarkChart } from "@/components/analysis/benchmark/benchmark-chart";
import { StatList, type Stat } from "@/components/analysis/stat-list";
import { InfoTip } from "@/components/common/info-tip";
import { LoadError } from "@/components/common/load-error";
import { Segmented } from "@/components/common/segmented";
import { Skeleton } from "@/components/common/skeleton";
import { RiskShares } from "@/components/rebalance/risk-shares";
import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { orderbookChartsQuery } from "@/lib/avanza/queries";
import { rebase, type ReturnPoint } from "@/lib/benchmark";
import { formatDate, formatDecimal, formatInteger, formatPercent, formatShare } from "@/lib/format";
import {
  alignGrowth,
  badMonth,
  covariance,
  dailyReturns,
  DAY,
  effectiveHoldings,
  historyStats,
  holdValue,
  MIN_DAYS,
  portfolioVol,
  riskShares,
  trackingError,
  yearly,
} from "@/lib/rebalance-check";

const periods = [
  { label: "3M", value: 3 },
  { label: "1Y", value: 12 },
  { label: "3Y", value: 36 },
] as const;

/** The last `months` months up to today; the dates as Avanza's yyyy-MM-dd. */
function rangeFor(months: number) {
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return { months, from: formatDate(from.getTime()), to: formatDate(Date.now()) };
}

/**
 * Under the orders (step 3): today's mix against the one after them, both bought at the start of the period
 * and held. Their history, their expected risk from how the holdings moved together, and which
 * holdings carry that risk.
 */
export function PlanCheck({ rows, cashLeft }: { rows: RebalanceRow[]; cashLeft: number }) {
  const [range, setRange] = useState(() => rangeFor(12));

  const hasOrders = rows.some((r) => r.order);
  const ids = rows.flatMap((r) => r.orderbookId ?? []);
  const query = orderbookChartsQuery(ids, { from: range.from, to: range.to });
  const { data, error, refetch } = useQuery({
    ...query,
    enabled: query.enabled && hasOrders,
    // Adding an instrument or changing the period keeps the last result up while the new loads.
    placeholderData: keepPreviousData,
  });

  // The orders table already says when there's nothing to trade.
  if (!hasOrders) return null;
  return (
    <section className="flex flex-col border-t">
      <header className="flex items-start gap-3 p-3 pb-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium">Check the orders</h3>
          <p className="text-muted-foreground text-xs">
            What if you had owned the planned mix instead of today's over the chosen period? Both
            are replayed on real prices, bought on day one and left alone. Use it to see how the
            orders change your risk, not to predict returns.
          </p>
        </div>
        <Segmented
          label="Period"
          numeric
          className="ml-auto"
          options={periods}
          value={range.months}
          onChange={(m) => setRange(rangeFor(m))}
        />
      </header>
      {error ? (
        <div className="p-3">
          <LoadError what="price history" error={error} onRetry={() => void refetch()} />
        </div>
      ) : !data ? (
        <div className="p-3">
          <Skeleton className="h-64" />
        </div>
      ) : (
        <Comparison
          rows={rows}
          cashLeft={cashLeft}
          from={Date.parse(range.from)}
          charts={new Map(data.map((c) => [c.orderbookId, c.relativeSeries]))}
        />
      )}
    </section>
  );
}

function Comparison({
  rows,
  cashLeft,
  from,
  charts,
}: {
  rows: RebalanceRow[];
  cashLeft: number;
  from: number;
  charts: Map<string, readonly { timestamp: number; performance: { value: number } }[]>;
}) {
  const totalBefore = rows.reduce((s, r) => s + r.value, 0);
  const afterValues = rows.map((r) => r.value + (r.order?.amount ?? 0));
  const totalAfter = afterValues.reduce((s, v) => s + v, 0) + cashLeft;
  const items = rows.map((r, i) => ({
    name: r.name,
    before: totalBefore ? r.value / totalBefore : 0,
    after: totalAfter ? afterValues[i]! / totalAfter : 0,
    series: rebase(
      (charts.get(r.orderbookId ?? "") ?? []).map((p) => ({
        timestamp: p.timestamp,
        value: p.performance.value,
      })),
    ),
  }));
  // Without a price history a holding counts as cash: it can't move either line.
  const priced = items.filter((it) => it.series.length > 1);
  const unpriced = items.filter((it) => it.series.length <= 1 && (it.before || it.after));

  const g = alignGrowth(priced.map((it) => it.series));
  const wb = priced.map((it) => it.before);
  const wa = priced.map((it) => it.after);
  const [before, after] = [wb, wa].map((w) => holdValue(w, g)) as [number[], number[]];
  const days = g.timestamps.length - 1;
  if (days < 2)
    return <p className="text-muted-foreground p-3">Not enough price history to compare.</p>;

  const enough = days >= MIN_DAYS;
  const cov = covariance(priced.map((_, i) => dailyReturns(g.growth[i]!)));
  const volB = portfolioVol(wb, cov);
  const volA = portfolioVol(wa, cov);
  const riskB = riskShares(wb, cov);
  const riskA = riskShares(wa, cov);
  const hb = historyStats(before);
  const ha = historyStats(after);

  const line = (values: number[]): ReturnPoint[] =>
    values.map((v, t) => ({ timestamp: g.timestamps[t]!, value: v - 1 }));
  // The youngest instrument sets the start; say which when it cut the period short.
  const start = g.timestamps[0]!;
  const youngest = priced.find((it) => Math.round((it.series[0]!.timestamp - start) / DAY) === 0);
  const cut = start - from > 30 * DAY ? youngest : undefined;

  /**
   * After (`a`) against today (`b`): the value turns up-blue when the plan is better, down-red
   * when worse, with the word too so it doesn't rest on color. `prefix` leads the note.
   */
  const pair = (
    label: string,
    a: number,
    b: number,
    format: (v: number) => string,
    higherIsBetter: boolean,
    prefix?: ReactNode,
  ): Stat => {
    // Equal once rounded for display is no change, whatever the float noise.
    const same = format(a) === format(b);
    const better = !same && a > b === higherIsBetter;
    return {
      label,
      value: <span className={cn(!same && (better ? "text-up" : "text-down"))}>{format(a)}</span>,
      note: (
        <>
          {prefix}
          Today {format(b)}
          {!same && (
            <span className={better ? "text-up" : "text-down"}>
              {better ? " · better" : " · worse"}
            </span>
          )}
        </>
      ),
    };
  };
  const stats: Stat[] = [
    pair("Return", ha.ret, hb.ret, formatPercent, true),
    pair("Volatility, per year", ha.vol, hb.vol, formatShare, false),
    pair("Largest fall", -ha.maxDrawdown, -hb.maxDrawdown, formatPercent, true),
    ...(enough ? [pair("Sharpe ratio", ha.sharpe, hb.sharpe, formatDecimal, true)] : []),
    ...(enough
      ? [
          pair("Expected volatility", yearly(volA), yearly(volB), formatShare, false),
          // As a share: in SEK it grows with new money even when the mix gets calmer.
          pair(
            "Bad month, 1 in 20",
            -badMonth(volA),
            -badMonth(volB),
            formatPercent,
            true,
            <span className="sensitive">{formatInteger(badMonth(volA) * totalAfter)} SEK · </span>,
          ),
        ]
      : []),
    pair(
      "Even holdings it equals",
      effectiveHoldings(items.map((it) => it.after)),
      effectiveHoldings(items.map((it) => it.before)),
      (v) => formatDecimal(Math.round(v * 10) / 10),
      true,
    ),
    {
      label: "Differs from today",
      value: formatShare(trackingError(before, after)),
      note: "typical gap per year",
    },
  ];

  return (
    <div className="@container flex flex-col gap-4 p-3">
      <BenchmarkChart
        series={[
          { label: "Today's mix", points: line(before) },
          { label: "After the orders", points: line(after) },
        ]}
      />
      <StatList stats={stats} />
      {enough && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 text-xs font-medium">
            Where the risk is
            <InfoTip label="where the risk is">
              Each holding's share of the money and of the ups and downs after the orders. One that
              moves a lot, or with the rest, takes more risk than money. The bar is today, the tick
              after the orders.
            </InfoTip>
          </h3>
          <RiskShares
            items={priced.map((it, i) => ({
              name: it.name,
              weight: it.after,
              before: riskB[i]!,
              after: riskA[i]!,
            }))}
          />
        </div>
      )}
      <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        {formatDate(start)} to today, {days} days.
        {cut && ` ${cut.name} has no older prices.`}
        {unpriced.length > 0 &&
          ` No price history for ${unpriced.map((it) => it.name).join(", ")}: counted as cash.`}
        {!enough && " Too short for expected risk."}
        <InfoTip label="how this is worked out">
          <p>
            Both mixes are bought on the first day and left alone, so a winner grows its share as it
            would have in your account. Cash left over earns nothing.
          </p>
          <p>
            The past is no promise. Over a short period the return line is mostly luck: which stocks
            happened to rally. Volatility, the largest fall and the expected risk say more about the
            mix itself. Expected volatility uses how the holdings moved together in this period; a
            bad month is about 1.65 times its monthly volatility.
          </p>
          <p>Returns are in each instrument's own currency: currency moves are left out.</p>
        </InfoTip>
      </p>
    </div>
  );
}
