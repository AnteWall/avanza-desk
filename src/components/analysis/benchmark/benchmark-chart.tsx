import { crosshair, defineChart, lineY, ruleY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import type { ReturnPoint } from "@/lib/benchmark";
import { formatPercent } from "@/lib/format";

// Literal class names so Tailwind keeps them; strokes follow the same palette order.
const palette = [
  { stroke: "var(--chart-1)", dot: "bg-chart-1" },
  { stroke: "var(--chart-2)", dot: "bg-chart-2" },
  { stroke: "var(--chart-3)", dot: "bg-chart-3" },
];

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });

/** Several return series (ratios from 0) on one axis, with a legend below. */
export function BenchmarkChart({
  series,
}: {
  series: readonly { label: string; points: readonly ReturnPoint[] }[];
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          crosshair({ x: { label: true }, y: { label: true }, strokeDasharray: "2 2" }),
          ruleY([0], { stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 3" }),
          ...series.map((s, i) =>
            lineY(s.points, {
              x: "timestamp",
              y: "value",
              stroke: palette[i % palette.length]!.stroke,
              strokeWidth: 1.5,
            }),
          ),
        ],
        scales: {
          x: { scale: scaleLinear, axis: { ticks: { format: (v: number) => date.format(v) } } },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { ticks: { format: formatPercent } },
          },
        },
        clip: true,
        focus: "group-x",
        tooltip,
      }),
    [series],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="h-64">
        <Chart
          definition={definition}
          ariaLabel="Return compared with benchmarks"
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        {series.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${palette[i % palette.length]!.dot}`} />
            {s.label}
            {s.points.length > 0 && (
              <span className="num text-foreground">{formatPercent(s.points.at(-1)!.value)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
