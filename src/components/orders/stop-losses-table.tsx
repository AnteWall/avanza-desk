import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { Side } from "@/components/common/side";
import { useAccount } from "@/components/layout/use-account";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { toStopLossRow, type StopLossRow } from "@/lib/avanza/loose-records";
import { stopLossesQuery } from "@/lib/avanza/queries";
import { formatDate, formatInteger, formatPrice, formatShare } from "@/lib/format";

const dash = "–";
// Percentage values are percent units ("5" = 5 %).
const amount = (value: number, percent: boolean) =>
  percent ? formatShare(value / 100) : formatPrice(value);

const col = dataTableColumns<StopLossRow>();
const columns = col.columns([
  col.accessor("name", { header: "Instrument", meta: { className: "font-medium" } }),
  col.accessor("trigger", {
    header: "Trigger",
    cell: (c) => {
      const t = c.getValue();
      if (!t) return dash;
      return `${t.type.toLowerCase().replaceAll("_", " ")} ${amount(t.value, t.percent)}`;
    },
    meta: { className: "num" },
  }),
  col.accessor((r) => r.order?.side, {
    id: "side",
    header: "Then",
    cell: (c) => <Side side={c.getValue()} />,
  }),
  col.accessor((r) => r.order?.volume, {
    id: "qty",
    header: "Qty",
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("order", {
    header: "Order price",
    cell: (c) => (c.getValue() ? amount(c.getValue()!.price, c.getValue()!.percent) : dash),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("status", {
    header: "Status",
    cell: (c) => c.getValue()?.toLowerCase().replaceAll("_", " ") ?? dash,
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor("validUntil", {
    header: "Valid until",
    cell: (c) => (c.getValue() ? formatDate(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
]);

/** Active stop-loss orders on every account. Suspends while loading. */
export function StopLossesTable() {
  const { data } = useSuspenseQuery(stopLossesQuery);
  const focus = useFocusInstrument();
  const { id: account } = useAccount();
  const rows = data
    .map(toStopLossRow)
    .filter((r) => !account || !r.accountId || r.accountId === account);

  if (rows.length === 0) return <Empty>No stop-loss orders.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => r.orderbookId && focus(r.orderbookId)}
      askAbout={(r) => instrumentItem(r.orderbookId, r.name)}
    />
  );
}
