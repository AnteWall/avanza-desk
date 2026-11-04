import { cn } from "cn";

import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import {
  AllocationDonut,
  type DonutSlice,
} from "@/components/portfolio/allocation/allocation-donut";
import type { Slice } from "@/lib/avanza/portfolio";
import { formatInteger, formatShare } from "@/lib/format";

/**
 * `scale`: share relative to the largest slice, so the biggest bar spans the column. `color`: its
 * slice in the donut, for the largest few; the others share its muted "Other" slice.
 */
type Row = Slice & { rest: boolean; scale: number; color?: string };

const palette = [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`);
const other = "color-mix(in oklab, var(--muted-foreground) 40%, transparent)";

// Below this width the SEK column gives way to the name; the amount stays in the row tooltip.
const wide = "@max-[19rem]:hidden";

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", {
    header: "Name",
    // A depth-bar tint behind the name (like the order book) keeps rows on one line.
    cell: (c) => (
      <>
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 rounded-sm",
            c.row.original.rest ? "bg-muted" : "bg-brand/15",
          )}
          style={{ width: `calc(${c.row.original.scale * 100}% - 0.5rem)` }}
        />
        <span
          title={c.getValue()}
          className={cn(
            "relative flex min-w-0 items-center gap-2",
            c.row.original.rest && "text-muted-foreground",
          )}
        >
          {c.row.original.color && (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: c.row.original.color }}
            />
          )}
          <CountryFlag code={c.row.original.code} />
          <span className="truncate">{c.getValue()}</span>
        </span>
      </>
    ),
    meta: { className: "relative w-full max-w-0" },
  }),
  col.accessor("share", {
    header: "Share",
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("value", {
    header: "SEK",
    cell: (c) => formatInteger(c.getValue()),
    meta: {
      align: "end",
      className: `sensitive num text-muted-foreground ${wide}`,
      headerClassName: wide,
    },
  }),
]);

/**
 * One allocation dimension: name on a share bar, share and SEK per slice. The `rest` slice (the data
 * gap) is muted and last, with `restNote` explaining it below; `limit` folds the long tail into
 * one "N more" row.
 */
export function AllocationTable({
  slices,
  rest,
  restNote,
  limit,
}: {
  slices: Slice[];
  rest?: string;
  restNote?: string;
  limit?: number;
}) {
  if (slices.length === 0) return <p className="text-muted-foreground p-3">Nothing invested.</p>;
  const max = Math.max(...slices.map((s) => s.share));
  const rows: Row[] = slices
    .filter((s) => s.key !== rest)
    .map((s, i) => ({ ...s, rest: false, scale: s.share / max, color: palette[i] }));
  const gap = slices.find((s) => s.key === rest);
  const shown = limit && rows.length > limit + 1 ? rows.slice(0, limit) : rows;
  const tail = rows.slice(shown.length);
  if (tail.length) {
    const value = tail.reduce((s, r) => s + r.value, 0);
    const share = tail.reduce((s, r) => s + r.share, 0);
    shown.push({ key: "~tail", name: `${tail.length} more`, value, share, rest: true, scale: 0 });
  }
  if (gap) shown.push({ ...gap, rest: true, scale: gap.share / max });
  const colored = rows.filter((r): r is DonutSlice & Row => !!r.color);
  const others = slices.filter((s) => !colored.some((c) => c.key === s.key));
  const split: DonutSlice[] = others.length
    ? [
        ...colored,
        {
          key: "~other",
          name: others.length === 1 ? others[0]!.name : `${others.length} others`,
          value: others.reduce((sum, s) => sum + s.value, 0),
          share: others.reduce((sum, s) => sum + s.share, 0),
          color: other,
        },
      ]
    : colored;
  return (
    <div className="@container">
      <div className="px-3 pt-2">
        <AllocationDonut slices={split} />
      </div>
      <DataTable columns={columns} data={shown} getRowId={(r) => r.key} />
      {rest && (
        <p className="text-muted-foreground p-3 text-xs">
          {formatShare(1 - (gap?.share ?? 0))} sorted, counting what's inside your funds
          {gap && restNote && ` · ${gap.name}: ${restNote}`}
        </p>
      )}
    </div>
  );
}
