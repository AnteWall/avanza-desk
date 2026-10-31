import {
  createColumnHelper,
  metaHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { cn } from "cn";
import { useState } from "react";
import type * as React from "react";

import { AskMenu } from "@/components/ai/ask-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContextItem } from "@/lib/ai/context";

type DataTableColumnMeta = {
  /** `end` right-aligns header and cells: use it for every numeric column. */
  align?: "end";
  /** Extra classes for the column's cells (not the header). */
  className?: string;
  /** Extra classes for the header cell, e.g. to hide the column in a narrow container. */
  headerClassName?: string;
};

const features = tableFeatures({ columnMeta: metaHelper<DataTableColumnMeta>() });
type Features = typeof features;

/** Column helper bound to DataTable's features. Call it once at module scope per row type. */
export const dataTableColumns = <TData extends RowData>() => createColumnHelper<Features, TData>();

/** Every table in the app: dense rows, sticky header, numeric alignment via `meta.align`. */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  selectedRowId,
  onRowClick,
  askAbout,
}: {
  // oxlint-disable-next-line no-explicit-any -- columns mix value types per accessor.
  columns: ColumnDef<Features, TData, any>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  selectedRowId?: string;
  /** Makes rows clickable and keyboard-focusable (↑↓ or j/k move, Enter activates). */
  onRowClick?: (row: TData) => void;
  /** What a row is, for its right-click "Ask the assistant" menu; omit for no menu. */
  askAbout?: (row: TData) => ContextItem | undefined;
}) {
  const table = useTable({ features, columns, data, getRowId });
  // The row under the last right-click, read by the menu as it opens.
  const [asked, setAsked] = useState<ContextItem>();

  const tbody = (
    <TableBody>
      {table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          data-selected={row.id === selectedRowId}
          onContextMenu={askAbout && (() => setAsked(askAbout(row.original)))}
          {...(onRowClick && {
            tabIndex: 0,
            className: "cursor-pointer outline-none focus-visible:bg-muted",
            onClick: () => onRowClick(row.original),
            onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
              if (e.key === "Enter") onRowClick(row.original);
              // ↑↓ or j/k move between rows; Enter then opens the focused one.
              const next = ["ArrowDown", "j"].includes(e.key)
                ? e.currentTarget.nextElementSibling
                : ["ArrowUp", "k"].includes(e.key)
                  ? e.currentTarget.previousElementSibling
                  : null;
              if (next instanceof HTMLElement) {
                e.preventDefault();
                next.focus();
              }
            },
          })}
        >
          {row.getAllCells().map((cell) => {
            const meta = cell.column.columnDef.meta;
            return (
              <TableCell
                key={cell.id}
                className={cn(meta?.align === "end" && "text-right", meta?.className)}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  header.column.columnDef.meta?.align === "end" && "text-right",
                  header.column.columnDef.meta?.headerClassName,
                )}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      {askAbout ? <AskMenu item={asked} trigger={tbody} /> : tbody}
    </Table>
  );
}
