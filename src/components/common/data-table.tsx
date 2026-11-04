import {
  createColumnHelper,
  metaHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { cn } from "cn";
import { Copy, FileDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { AskMenu } from "@/components/ai/ask-menu";
import { ContextMenuItem, ContextMenuShortcut } from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContextItem } from "@/lib/ai/context";
import { pickCsvPath, toCsv, writeCsv } from "@/lib/csv";
import { stockholmDay } from "@/lib/snapshots";

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

// Clicks and keys inside these belong to the control, not to row selection.
const control = "input, textarea, select, button, a, [role=switch]";

/** The selected rows as they read on screen, tab-separated: pastes into a spreadsheet. */
function copyRows(table: HTMLTableElement | null) {
  const rows = table?.querySelectorAll<HTMLTableRowElement>('tbody tr[data-selected="true"]');
  const text = [...(rows ?? [])]
    .map((tr) => [...tr.cells].map((td) => td.innerText.trim()).join("\t"))
    .join("\n");
  if (text) void navigator.clipboard.writeText(text);
}

/** The whole table as it reads on screen, header first, saved as a CSV file. */
async function exportTable(table: HTMLTableElement | null) {
  if (!table) return;
  const cells = (tr: HTMLTableRowElement) => [...tr.cells].map((c) => c.innerText.trim());
  const rows = [...table.querySelectorAll<HTMLTableRowElement>("thead tr, tbody tr")].map(cells);
  const path = await pickCsvPath("Export table", `avanzadesk-${stockholmDay()}.csv`);
  if (!path) return;
  try {
    await writeCsv(path, toCsv(rows));
    toast("Table exported", { description: path });
  } catch (error) {
    toast.error("Couldn't export the table", { description: String(error) });
  }
}

/**
 * Every table in the app: dense rows, sticky header, numeric alignment via `meta.align`.
 * Rows select like a file list: click, ⌘/Ctrl-click, Shift-click, drag, Shift+↑↓, ⌘A, Esc;
 * ⌘C or the right-click menu copies the selection; the menu also exports the table as CSV.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  selectedRowId,
  onRowClick,
  onRowHover,
  askAbout,
  rowMenu,
}: {
  // oxlint-disable-next-line no-explicit-any -- columns mix value types per accessor.
  columns: ColumnDef<Features, TData, any>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  selectedRowId?: string;
  /** Makes rows clickable (↑↓ or j/k move, Enter activates). */
  onRowClick?: (row: TData) => void;
  /** The row under the pointer or keyboard focus, `undefined` when it leaves. */
  onRowHover?: (row: TData | undefined) => void;
  /** What a row is, for its right-click "Ask the assistant" menu. */
  askAbout?: (row: TData) => ContextItem | undefined;
  /** More right-click items, acting on the selected rows. */
  rowMenu?: (rows: TData[]) => React.ReactNode;
}) {
  const table = useTable({ features, columns, data, getRowId });
  const tableRef = useRef<HTMLTableElement>(null);
  // The row under the last right-click, read by the menu as it opens.
  const [asked, setAsked] = useState<ContextItem>();
  const [selection, setSelection] = useState<string[]>([]);
  // Where Shift-click and drag ranges start, and whether the mouse is down for a drag.
  const anchor = useRef<string>(undefined);
  const dragging = useRef(false);
  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const rows = table.getRowModel().rows;
  const ids = rows.map((r) => r.id);
  const range = (from: string, to: string) => {
    const [a, b] = [ids.indexOf(from), ids.indexOf(to)].sort((x, y) => x - y);
    return a < 0 ? [to] : ids.slice(a, b + 1);
  };
  const selectedRows = rows.filter((r) => selection.includes(r.id)).map((r) => r.original);
  const select = (id: string) => {
    anchor.current = id;
    setSelection([id]);
  };

  const tbody = (
    <TableBody>
      {rows.map((row, i) => (
        <TableRow
          key={row.id}
          data-selected={row.id === selectedRowId || selection.includes(row.id)}
          tabIndex={0}
          // select-none keeps drags from selecting text; inputs stay editable.
          className={cn(
            "outline-none select-none focus-visible:bg-muted [&_input]:select-text",
            onRowClick && "cursor-pointer",
          )}
          onContextMenu={() => {
            if (askAbout) setAsked(askAbout(row.original));
            if (!selection.includes(row.id)) select(row.id);
          }}
          onMouseDown={(e) => {
            if (e.button !== 0 || (e.target as Element).closest(control)) return;
            if (e.metaKey || e.ctrlKey) {
              anchor.current = row.id;
              setSelection((s) =>
                s.includes(row.id) ? s.filter((id) => id !== row.id) : [...s, row.id],
              );
            } else if (e.shiftKey) {
              setSelection(range(anchor.current ?? row.id, row.id));
            } else {
              select(row.id);
              dragging.current = true;
            }
          }}
          onMouseLeave={() => onRowHover?.(undefined)}
          onFocus={(e) => e.target === e.currentTarget && onRowHover?.(row.original)}
          onBlur={() => onRowHover?.(undefined)}
          onMouseEnter={(e) => {
            onRowHover?.(row.original);
            if (dragging.current && e.buttons === 1) {
              setSelection(range(anchor.current ?? row.id, row.id));
            }
          }}
          onClick={(e) => {
            // Modifier clicks only change the selection.
            if (!(e.metaKey || e.ctrlKey || e.shiftKey)) onRowClick?.(row.original);
          }}
          onKeyDown={(e) => {
            // Keys typed into a control in the row are the control's.
            if (e.target !== e.currentTarget) return;
            const mod = e.metaKey || e.ctrlKey;
            if (e.key === "Enter") onRowClick?.(row.original);
            if (e.key === "Escape") setSelection([]);
            if (mod && e.key === "a") {
              e.preventDefault();
              setSelection(ids);
            }
            if (mod && e.key === "c") copyRows(tableRef.current);
            // ↑↓ or j/k move between rows; Enter then opens the focused one. Shift extends.
            const step = ["ArrowDown", "j"].includes(e.key)
              ? 1
              : ["ArrowUp", "k"].includes(e.key)
                ? -1
                : 0;
            const next = ids[i + step];
            const el =
              step > 0
                ? e.currentTarget.nextElementSibling
                : e.currentTarget.previousElementSibling;
            if (step && next && el instanceof HTMLElement) {
              e.preventDefault();
              el.focus();
              if (e.shiftKey) setSelection(range(anchor.current ?? row.id, next));
              else select(next);
            }
          }}
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

  const extra = rowMenu && selectedRows.length > 0 && rowMenu(selectedRows);
  return (
    <Table ref={tableRef}>
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
      <AskMenu
        item={asked}
        trigger={tbody}
        extra={
          selectedRows.length > 0 && (
            <>
              {extra}
              <ContextMenuItem onClick={() => copyRows(tableRef.current)}>
                <Copy />
                {selectedRows.length === 1 ? "Copy row" : `Copy ${selectedRows.length} rows`}
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => void exportTable(tableRef.current)}>
                <FileDown />
                Export table as CSV…
              </ContextMenuItem>
            </>
          )
        }
      />
    </Table>
  );
}
