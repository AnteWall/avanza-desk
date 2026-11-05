import { useQueries, useSuspenseQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PriceTargets } from "avanza-ts";
import { useMemo } from "react";

import { Change } from "@/components/common/change";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { InstrumentType } from "@/lib/avanza/codes";
import {
  fundamentalsQuery,
  morningstarQuery,
  quoteQuery,
  universeQuery,
} from "@/lib/avanza/queries";
import type { UniverseStock } from "@/lib/avanza/universe";
import { formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";
import { byUpside, parseFairValue, upside } from "@/lib/upside";

type Row = {
  stock: UniverseStock;
  last?: number;
  target?: PriceTargets;
  targetUpside?: number;
  consensus?: string;
  fairValue?: number;
  fairUpside?: number;
  moat?: string;
};

const dash = "–";
const words = (code: string) =>
  m.signals.upside.consensus[code] ?? code.toLowerCase().replaceAll("_", " ");
const dataOf = <T,>(results: UseQueryResult<T>[]) => results.map((r) => r.data);

const col = dataTableColumns<Row>();
const analystColumns = col.columns([
  col.accessor((r) => r.stock.name, {
    id: "name",
    header: m.signals.table.stock,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.stock.isin} name={c.getValue()} />
        <span className="max-w-40 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("last", {
    header: m.common.last,
    cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("target", {
    header: m.signals.upside.target,
    cell: (c) => {
      const t = c.getValue();
      if (!t?.numberOfEstimates) return dash;
      return (
        <span title={`${formatPrice(t.lowPriceTarget)} – ${formatPrice(t.highPriceTarget)}`}>
          {formatPrice(t.averagePriceTarget)}
        </span>
      );
    },
    meta: { align: "end", className: "num" },
  }),
  col.accessor("targetUpside", {
    header: infoHeader(m.signals.upside.upside, m.signals.upside.upsideTip),
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor((r) => r.target?.numberOfEstimates, {
    id: "analysts",
    header: m.signals.upside.analysts,
    cell: (c) => (c.getValue() ? formatInteger(c.getValue()!) : dash),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("consensus", {
    header: m.signals.upside.analystsSay,
    cell: (c) => <span className="capitalize">{c.getValue() ?? dash}</span>,
    meta: { className: "text-muted-foreground" },
  }),
]);
// Morningstar's columns, shown only when Morningstar covers at least one stock.
const allColumns = [
  ...analystColumns,
  ...col.columns([
    col.accessor("fairValue", {
      header: infoHeader(m.signals.upside.fairValue, m.signals.upside.fairValueTip),
      cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
      meta: { align: "end", className: "num" },
    }),
    col.accessor("fairUpside", {
      header: m.signals.upside.toFairValue,
      cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
      meta: { align: "end", className: "num" },
    }),
    col.accessor("moat", {
      header: infoHeader(m.signals.upside.moat, m.signals.upside.moatTip),
      cell: (c) => {
        const moat = c.getValue();
        return moat ? (m.signals.upside.moats[moat] ?? moat) : dash;
      },
      meta: { className: "text-muted-foreground" },
    }),
  ]),
];

/**
 * Held and watched stocks against the analysts' average target and Morningstar's fair value.
 * Each source fills in as it loads; a stock without coverage keeps dashes and sorts last.
 */
export function UpsideTable() {
  const { data: universe } = useSuspenseQuery(universeQuery);
  const focus = useFocusInstrument();
  const ids = universe.map((s) => s.orderbookId);
  const fundamentals = useQueries({ queries: ids.map(fundamentalsQuery), combine: dataOf });
  const quotes = useQueries({ queries: ids.map(quoteQuery), combine: dataOf });
  const morningstar = useQueries({
    queries: ids.map((id) => ({ ...morningstarQuery(id), retry: false })),
    combine: dataOf,
  });

  const rows = useMemo(
    () =>
      universe
        .map((stock, i): Row => {
          const last = quotes[i]?.last ?? undefined;
          const target = fundamentals[i]?.targets ?? undefined;
          const ms = morningstar[i]?.morningstar;
          // shortcut: fair value is assumed to be in the quote currency; check `fairValue.currency` if a mismatch shows up.
          const fairValue = parseFairValue(ms?.fairValue.financialValue);
          const consensus = fundamentals[i]?.recommendations?.consensusAction;
          return {
            stock,
            last,
            target,
            targetUpside: target?.numberOfEstimates
              ? upside(last, target.averagePriceTarget)
              : undefined,
            consensus: consensus && consensus !== "UNKNOWN" ? words(consensus) : undefined,
            fairValue,
            fairUpside: upside(last, fairValue),
            moat: ms?.moat.value || undefined,
          };
        })
        .sort(byUpside),
    [universe, quotes, fundamentals, morningstar],
  );

  if (rows.length === 0) return <Empty>{m.signals.upside.empty}</Empty>;
  return (
    <DataTable
      columns={rows.some((r) => r.fairValue != null || r.moat) ? allColumns : analystColumns}
      data={rows}
      getRowId={(r) => r.stock.orderbookId}
      onRowClick={(r) => focus(r.stock.orderbookId, InstrumentType.Stock)}
      askAbout={(r) =>
        instrumentItem(r.stock.orderbookId, r.stock.name, InstrumentType.Stock, r.stock.isin)
      }
    />
  );
}
