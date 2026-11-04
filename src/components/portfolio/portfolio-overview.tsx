import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { SignedAmount } from "@/components/common/signed-amount";
import { GroupPicker } from "@/components/portfolio/holdings/group-picker";
import { useGroup } from "@/components/portfolio/holdings/use-groups";
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
  const { holdings } = useHoldings({ grouped: true });
  const group = useGroup();
  const { data: stockRatios } = useQuery(stockKeyRatiosQuery);

  // A group is just its holdings: no cash.
  const groupValue = holdings.reduce((s, h) => s + h.value, 0);
  const total = group ? groupValue : totals.totalValue.totalValue.value;
  const invested = group ? groupValue : totals.totalValue.positionValue.value;
  const profit = holdings.reduce((s, h) => s + h.profit, 0);
  const cost = holdings.reduce((s, h) => s + h.cost, 0);
  const biggest = holdings.reduce<(typeof holdings)[number] | undefined>(
    (top, h) => (!top || h.value > top.value ? h : top),
    undefined,
  );
  const yields = stockRatios && dividendYields(stockRatios);
  const dividends =
    yields && holdings.reduce((s, h) => s + h.value * (holdingYield(h, yields) ?? 0), 0);

  return (
    <dl className="bg-card flex items-center gap-x-10 overflow-hidden rounded-md border px-4 py-2.5">
      {/* First, so what the numbers cover reads before the numbers. */}
      <div className="-my-1 flex flex-col gap-0.5 border-r pr-10">
        <dt className="text-muted-foreground text-xs">Showing</dt>
        <dd>
          <GroupPicker />
        </dd>
      </div>
      <Kpi
        label={group ? `${group.name} value` : "Total value"}
        className="sensitive text-lg font-semibold"
      >
        {formatPrice(total)} SEK
      </Kpi>
      <Kpi
        label="In holdings"
        hint="What your stocks and funds are worth right now, without cash."
        className="sensitive"
      >
        {formatInteger(invested)}
      </Kpi>
      <Kpi
        label="Gain since you bought"
        hint="What your holdings are worth now minus what you paid for them. It becomes real when you sell (also called unrealized P/L)."
      >
        <SignedAmount value={profit} className="sensitive" />
        {cost > 0 && <Change ratio={profit / cost} className="ml-2 text-xs" />}
      </Kpi>
      {!group && (
        <Kpi label="Cash" className="sensitive">
          {formatInteger(total - invested)}
        </Kpi>
      )}
      <Kpi
        label="Dividends per year"
        hint="Roughly what your stocks would pay you in a year at today's dividend yields."
      >
        <span className="sensitive">{dividends == null ? "–" : formatInteger(dividends)}</span>
        {dividends != null && invested > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            {formatShare(dividends / invested)}
          </span>
        )}
      </Kpi>
      {/* The numbers in a sentence, for anyone who doesn't read KPI rows. */}
      {biggest && total > 0 && (
        <p className="text-muted-foreground ml-auto hidden max-w-md text-xs leading-relaxed xl:block">
          {cost > 0 && (
            <>
              Your holdings are {profit >= 0 ? "up" : "down"}{" "}
              <span className="num text-foreground">{formatShare(Math.abs(profit / cost))}</span> on
              what you paid.{" "}
            </>
          )}
          Your biggest holding is <span className="text-foreground">{biggest.name}</span>, at{" "}
          <span className="num text-foreground">{formatShare(biggest.value / total)}</span> of your
          money.
        </p>
      )}
    </dl>
  );
}
