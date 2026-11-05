import { useSuspenseQuery } from "@tanstack/react-query";
import type { TotalValuesAccount } from "avanza-ts";

import { Change } from "@/components/common/change";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { SignedAmount } from "@/components/common/signed-amount";
import { positionsQuery, totalValuesQuery } from "@/lib/avanza/queries";
import { sessionLabel } from "@/lib/exchanges";
import { formatInteger, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

type Row = {
  id: string;
  name: string;
  type: string;
  value: number;
  cash: number;
  buyingPower: number;
  share: number;
  today: number;
  todayRatio: number;
};

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", {
    header: m.common.account,
    cell: (c) => (
      <span className="flex items-baseline gap-1.5">
        <span className="max-w-40 truncate font-medium">{c.getValue()}</span>
        <span className="text-muted-foreground text-xs">{c.row.original.type}</span>
      </span>
    ),
  }),
  col.accessor("value", {
    header: m.common.value,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
  col.accessor("share", {
    header: m.portfolio.accounts.share,
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("today", {
    // The last trading day: "Friday" over a weekend.
    header: () => sessionLabel(new Date()),
    cell: (c) => (
      <span className="flex justify-end gap-2">
        <SignedAmount value={c.getValue()} />
        <Change ratio={c.row.original.todayRatio} className="w-16" />
      </span>
    ),
    meta: { align: "end", className: "sensitive" },
  }),
  col.accessor("cash", {
    header: m.common.cash,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor("buyingPower", {
    header: m.portfolio.accounts.buyingPower,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
]);

const toRow = (a: TotalValuesAccount, total: number, today: { value: number; change: number }) => ({
  id: a.info.id,
  name: a.info.name,
  type: a.info.type,
  value: a.totalValue.totalValue.value,
  cash: a.totalValue.totalValue.value - a.totalValue.positionValue.value,
  buyingPower: a.buyingPower.total.value,
  share: total ? a.totalValue.totalValue.value / total : 0,
  today: today.change,
  todayRatio: today.value - today.change > 0 ? today.change / (today.value - today.change) : 0,
});

/** Every account's value, share of the total, today's move and cash. Largest first. */
export function AccountsTable() {
  const { data: totals } = useSuspenseQuery(totalValuesQuery);
  const { data: positions } = useSuspenseQuery(positionsQuery);

  // Today's move per account: Avanza only reports it per position.
  const todayByAccount = new Map<string, { value: number; change: number }>();
  for (const p of positions.withOrderbook) {
    const t = todayByAccount.get(p.account.id) ?? { value: 0, change: 0 };
    t.value += p.value.value;
    t.change += p.lastTradingDayPerformance?.absolute?.value ?? 0;
    todayByAccount.set(p.account.id, t);
  }
  const total = totals.totalValue.totalValue.value;
  const rows = totals.accounts
    .map((a) => toRow(a, total, todayByAccount.get(a.info.id) ?? { value: 0, change: 0 }))
    .sort((a, b) => b.value - a.value);

  if (rows.length === 0)
    return <p className="text-muted-foreground p-3">{m.portfolio.accounts.empty}</p>;
  return <DataTable columns={columns} data={rows} getRowId={(r) => r.id} />;
}
