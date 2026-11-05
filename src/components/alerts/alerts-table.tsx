import { useSuspenseQuery } from "@tanstack/react-query";
import type { AlertsResponse } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { toAlertRow, type AlertRow } from "@/lib/avanza/loose-records";
import { alertsQuery } from "@/lib/avanza/queries";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const dash = "–";

const col = dataTableColumns<AlertRow>();
const columns = col.columns([
  col.accessor("name", { header: m.common.instrument, meta: { className: "font-medium" } }),
  col.accessor("direction", {
    header: m.alerts.table.when,
    cell: (c) => c.getValue()?.toLowerCase().replaceAll("_", " ") ?? dash,
  }),
  col.accessor("value", {
    header: m.alerts.table.level,
    cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("channels", {
    header: m.alerts.table.notifyBy,
    cell: (c) => c.getValue() || dash,
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor("validUntil", {
    header: m.alerts.table.validUntil,
    cell: (c) => (c.getValue() ? formatDate(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
]);

const triggeredColumns = col.columns([
  col.accessor("triggered", {
    header: m.alerts.table.triggered,
    cell: (c) => (c.getValue() ? formatDateTime(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
  ...columns.slice(0, 3),
]);

const emptyText = m.alerts.table.empty;

/**
 * One kind of alert, or the ones that have triggered. Read-only: avanza-ts can't create
 * alerts. Suspends while loading.
 */
export function AlertsTable({ list }: { list: keyof AlertsResponse | "triggered" }) {
  const focus = useFocusInstrument();
  const { data } = useSuspenseQuery(alertsQuery(list));
  const rows = data.map(toAlertRow);

  if (rows.length === 0) return <Empty>{emptyText[list]}</Empty>;
  return (
    <DataTable
      columns={list === "triggered" ? triggeredColumns : columns}
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => r.orderbookId && focus(r.orderbookId, r.type)}
      askAbout={(r) => instrumentItem(r.orderbookId, r.name, r.type)}
    />
  );
}
