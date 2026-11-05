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
import { m } from "@/lib/i18n";

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
    <dl className="bg-card @container flex flex-wrap items-center gap-x-10 gap-y-2 overflow-hidden rounded-md border px-4 py-2.5">
      {/* First, so what the numbers cover reads before the numbers. */}
      <div className="-my-1 flex flex-col gap-0.5 border-r pr-10">
        <dt className="text-muted-foreground text-xs">{m.portfolio.overview.showing}</dt>
        <dd>
          <GroupPicker />
        </dd>
      </div>
      <Kpi
        label={
          group ? m.portfolio.overview.groupValue(group.name) : m.portfolio.overview.totalValue
        }
        className="sensitive text-lg font-semibold"
      >
        {formatPrice(total)} SEK
      </Kpi>
      <Kpi
        label={m.portfolio.overview.inHoldings}
        hint={m.portfolio.overview.inHoldingsHint}
        className="sensitive"
      >
        {formatInteger(invested)}
      </Kpi>
      <Kpi label={m.portfolio.overview.gain} hint={m.portfolio.overview.gainHint}>
        <SignedAmount value={profit} className="sensitive" />
        {cost > 0 && <Change ratio={profit / cost} className="ml-2 text-xs" />}
      </Kpi>
      {!group && (
        <Kpi label={m.common.cash} className="sensitive">
          {formatInteger(total - invested)}
        </Kpi>
      )}
      <Kpi
        label={m.portfolio.overview.dividendsPerYear}
        hint={m.portfolio.overview.dividendsPerYearHint}
      >
        <span className="sensitive">{dividends == null ? "–" : formatInteger(dividends)}</span>
        {dividends != null && invested > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            {formatShare(dividends / invested)}
          </span>
        )}
      </Kpi>
      {/* The numbers in a sentence, for anyone who doesn't read KPI rows. Sized by the bar, not
          the window: beside a wide assistant panel it would squeeze to a word per line. */}
      {biggest && total > 0 && (
        <p className="text-muted-foreground ml-auto hidden max-w-md text-xs leading-relaxed @min-[88rem]:block">
          {cost > 0 &&
            m.portfolio.overview.onCost(
              profit >= 0,
              <span key="share" className="num text-foreground">
                {formatShare(Math.abs(profit / cost))}
              </span>,
            )}
          {m.portfolio.overview.biggest(
            <span key="name" className="text-foreground">
              {biggest.name}
            </span>,
            <span key="share" className="num text-foreground">
              {formatShare(biggest.value / total)}
            </span>,
          )}
        </p>
      )}
    </dl>
  );
}
