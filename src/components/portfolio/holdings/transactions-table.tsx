import { useSuspenseQuery } from "@tanstack/react-query";
import type { Transaction } from "avanza-ts";
import { useState } from "react";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { SignedAmount } from "@/components/common/signed-amount";
import { useGroup } from "@/components/portfolio/holdings/use-groups";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { transactionsQuery } from "@/lib/avanza/queries";
import { formatDate, formatInteger, formatPrice } from "@/lib/format";
import { inGroup } from "@/lib/groups";
import { m } from "@/lib/i18n";

const dash = "–";

const col = dataTableColumns<Transaction>();
const columns = col.columns([
  col.accessor("date", {
    header: m.common.date,
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor((t) => t.backofficeTypeText || t.type, {
    id: "type",
    header: m.common.type,
  }),
  col.accessor((t) => t.orderbook?.name ?? t.instrumentName ?? t.description, {
    id: "instrument",
    header: m.common.instrument,
    meta: { className: "max-w-56 truncate font-medium" },
  }),
  col.accessor((t) => t.volume?.value, {
    id: "qty",
    header: m.common.quantity,
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor((t) => t.priceInTradedCurrency, {
    id: "price",
    header: m.common.price,
    cell: (c) =>
      c.getValue() ? `${formatPrice(c.getValue()!.value)} ${c.getValue()!.unit}` : dash,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor((t) => t.amount?.value, {
    id: "amount",
    header: m.portfolio.transactions.amount,
    cell: (c) => (c.getValue() == null ? dash : <SignedAmount value={c.getValue()!} />),
    meta: { align: "end", className: "sensitive font-medium" },
  }),
  col.accessor((t) => t.commission?.value, {
    id: "fee",
    header: m.portfolio.transactions.fee,
    cell: (c) => (c.getValue() ? formatPrice(c.getValue()!) : dash),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor((t) => t.account.name, {
    id: "account",
    header: m.common.account,
    meta: { className: "text-muted-foreground" },
  }),
]);

/**
 * Every transaction on every account (in the selected group) over the last 12 months, newest
 * first. Suspends.
 */
export function TransactionsTable() {
  // Fixed at mount so the query key doesn't change at midnight.
  const [from] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const { data } = useSuspenseQuery(transactionsQuery(from));
  const group = useGroup();
  const focus = useFocusInstrument();
  // A group holds instruments: its view drops cash moves like deposits.
  const rows = data.transactions
    .filter((t) => !group || inGroup(group, t.orderbook?.id, t.isin))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (rows.length === 0) return <Empty>{m.portfolio.transactions.empty}</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(t) => t.id}
      onRowClick={(t) => t.orderbook && focus(t.orderbook.id, t.orderbook.type)}
    />
  );
}
