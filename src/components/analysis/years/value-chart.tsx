import { defineChart, dot, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatCompact, formatInteger } from "@/lib/format";
import type { YearRow } from "@/lib/years";

const series = [
  { key: "end", label: "Value", stroke: "var(--chart-1)", dot: "bg-chart-1", dash: undefined },
  {
    key: "deposited",
    label: "Deposited",
    stroke: "var(--chart-2)",
    dot: "bg-chart-2",
    dash: "4 3",
  },
] as const;

/** Year-end value against the money put in so far; the gap between the lines is the growth. */
export function ValueChart({ rows }: { rows: readonly YearRow[] }) {
  const definition = useMemo(() => {
    const points = series.flatMap((s) =>
      rows.map((r) => ({ year: String(r.year), kind: s.label, value: r[s.key], row: r })),
    );
    return defineChart({
      marks: series.flatMap((s) => {
        const mine = points.filter((p) => p.kind === s.label);
        return [
          lineY(mine, {
            x: "year",
            y: "value",
            stroke: s.stroke,
            strokeWidth: 2,
            strokeDasharray: s.dash,
          }),
          dot(mine, { x: "year", y: "value", r: 3, fill: s.stroke, stroke: "var(--card)" }),
        ];
      }),
      scales: {
        x: { scale: () => scalePoint<string>().padding(0.3) },
        y: {
          // From zero, so the gap between the lines reads at its true size.
          scale: scaleLinear().domain([0, Math.max(1, ...points.map((p) => p.value))]),
          nice: true,
          grid: true,
          axis: { ticks: { format: formatCompact } },
        },
      },
      focus: "group-x",
      tooltip: {
        use: tooltip,
        className: "sensitive",
        content: (points) => {
          const r = (points[0]!.datum as { row: YearRow }).row;
          return {
            title: `${r.year} · SEK`,
            rows: [
              { label: "Value", value: formatInteger(r.end), color: series[0].stroke },
              { label: "Deposited", value: formatInteger(r.deposited), color: series[1].stroke },
              { label: "Growth", value: formatInteger(r.end - r.deposited), active: true },
            ],
          };
        },
      },
    });
  }, [rows]);

  return (
    <div className="flex flex-col gap-2">
      <div className="sensitive h-56">
        <Chart
          definition={definition}
          ariaLabel="Portfolio value and money deposited, per year"
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <ul className="text-muted-foreground flex gap-4 text-xs">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${s.dot}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
