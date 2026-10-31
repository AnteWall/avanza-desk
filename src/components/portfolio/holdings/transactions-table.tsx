import { useSuspenseQuery } from "@tanstack/react-query";
import type { Transaction } from "avanza-ts";
import { useState } from "react";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { SignedAmount } from "@/components/common/signed-amount";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { transactionsQuery } from "@/lib/avanza/queries";
import { formatDate, formatInteger, formatPrice } from "@/lib/format";

const dash = "–";

const col = dataTableColumns<Transaction>();
const columns = col.columns([
  col.accessor("date", {
    header: "Date",
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor((t) => t.backofficeTypeText || t.type, {
    id: "type",
    header: "Type",
  }),
  col.accessor((t) => t.orderbook?.name ?? t.instrumentName ?? t.description, {
    id: "instrument",
    header: "Instrument",
    meta: { className: "max-w-56 truncate font-medium" },
  }),
  col.accessor((t) => t.volume?.value, {
    id: "qty",
    header: "Qty",
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor((t) => t.priceInTradedCurrency, {
    id: "price",
    header: "Price",
    cell: (c) =>
      c.getValue() ? `${formatPrice(c.getValue()!.value)} ${c.getValue()!.unit}` : dash,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor((t) => t.amount?.value, {
    id: "amount",
    header: "Amount (SEK)",
    cell: (c) => (c.getValue() == null ? dash : <SignedAmount value={c.getValue()!} />),
    meta: { align: "end", className: "sensitive font-medium" },
  }),
  col.accessor((t) => t.commission?.value, {
    id: "fee",
    header: "Fee",
    cell: (c) => (c.getValue() ? formatPrice(c.getValue()!) : dash),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor((t) => t.account.name, {
    id: "account",
    header: "Account",
    meta: { className: "text-muted-foreground" },
  }),
]);

/** Every transaction on every account over the last 12 months, newest first. Suspends. */
export function TransactionsTable() {
  // Fixed at mount so the query key doesn't change at midnight.
  const [from] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const { data } = useSuspenseQuery(transactionsQuery(from));
  const focus = useFocusInstrument();
  const rows = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));

  if (rows.length === 0) return <Empty>No transactions in the last 12 months.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(t) => t.id}
      onRowClick={(t) => t.orderbook && focus(t.orderbook.id, t.orderbook.type)}
    />
  );
}
