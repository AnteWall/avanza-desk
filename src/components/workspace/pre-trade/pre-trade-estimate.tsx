import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { type Focus } from "@/components/workspace/use-focused-instrument";
import { estimateFill } from "@/lib/avanza/fill-estimate";
import { tickAt } from "@/lib/avanza/links";
import { holding } from "@/lib/avanza/portfolio";
import {
  exchangeRatesQuery,
  instrumentQuery,
  orderDepthQuery,
  positionsQuery,
  tradingRulesQuery,
} from "@/lib/avanza/queries";
import { formatInteger, formatPercent, formatPrice } from "@/lib/format";

/**
 * What a market order of `quantity` would cost against the live book, in SEK too for foreign
 * instruments, and the tick size at the best price. Suspends while loading.
 */
export function PreTradeEstimate({
  focus,
  side,
  quantity,
}: {
  focus: Focus;
  side: "buy" | "sell";
  quantity: number;
}) {
  const { data: instrument } = useSuspenseQuery(instrumentQuery(focus.id, focus.type));
  const { data: depth } = useSuspenseQuery(orderDepthQuery(focus.id));
  const { data: positions } = useQuery(positionsQuery);
  // Decorations: without them the estimate still shows.
  const { data: rules } = useQuery(tradingRulesQuery(focus.id));
  const foreign = instrument.currency !== "SEK";
  const { data: rates } = useQuery({ ...exchangeRatesQuery, enabled: foreign });

  const fill = estimateFill(depth, side, quantity);
  // Avanza omits `levels` for some instruments, despite the SDK type.
  const best =
    side === "buy" ? depth.levels?.[0]?.sellSide?.price : depth.levels?.[0]?.buySide?.price;
  const slippage = fill.averagePrice != null && best ? fill.averagePrice / best - 1 : null;
  const held = holding(positions, focus.id);
  const pnl =
    side === "sell" && held && fill.averagePrice != null
      ? (fill.averagePrice - held.averagePrice) * Math.min(fill.filled, held.volume)
      : null;

  const rows: { label: string; value: string; className?: string }[] = [
    {
      label: "Est. avg price",
      value: fill.averagePrice == null ? "–" : formatPrice(fill.averagePrice),
    },
    {
      label: "Slippage vs best",
      value: slippage == null ? "–" : `${formatPercent(slippage)} · ${fill.levels} lvl`,
    },
    {
      label: `Total (${instrument.currency})`,
      value: formatPrice(fill.cost),
      className: "font-medium",
    },
  ];
  // Avanza sends rates as Swedish decimal strings: you buy currency at `buyPrice`.
  const rate = rates?.find((r) => r.currency === instrument.currency);
  const sek = rate && Number((side === "buy" ? rate.buyPrice : rate.sellPrice).replace(",", "."));
  if (foreign && sek) rows.push({ label: "Total (SEK)", value: formatPrice(fill.cost * sek) });
  const tick = best != null && rules ? tickAt(rules.tickSizeList.tickSizeEntries, best) : undefined;
  if (tick != null) rows.push({ label: "Tick size", value: formatPrice(tick) });
  if (rules && rules.tradingUnit > 1)
    rows.push({ label: "Trading unit", value: formatInteger(rules.tradingUnit) });
  if (held)
    rows.unshift({ label: "You own", value: formatInteger(held.volume), className: "sensitive" });
  if (fill.filled < quantity)
    rows.push({
      label: "Visible depth",
      value: `only ${formatInteger(fill.filled)}`,
      className: "text-down",
    });
  if (pnl != null)
    rows.push({
      label: "Realized P&L",
      value: formatPrice(pnl),
      className: cn("sensitive", pnl >= 0 ? "text-up" : "text-down"),
    });

  return (
    <dl className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className={cn("num", r.className)}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
