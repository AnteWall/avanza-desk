import { barY, defineChart, stack } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatCompact, formatInteger } from "@/lib/format";
import type { YearRow } from "@/lib/years";

const kinds = [
  { label: "Paid", fill: "var(--chart-1)", dot: "bg-chart-1" },
  { label: "Expected", fill: "var(--chart-2)", dot: "bg-chart-2" },
] as const;

type Bar = { year: string; kind: string; value: number };

/**
 * Dividends paid per year; this year's bar adds what's still expected (announced or repeating
 * last year) on top, so it compares with full years.
 */
export function DividendChart({ rows, expected }: { rows: readonly YearRow[]; expected: number }) {
  const definition = useMemo(() => {
    const last = rows.at(-1)?.year;
    const bars: Bar[] = rows.flatMap((r) => [
      { year: String(r.year), kind: kinds[0].label, value: r.dividends },
      { year: String(r.year), kind: kinds[1].label, value: r.year === last ? expected : 0 },
    ]);
    return defineChart({
      marks: [
        barY(bars, {
          x: "year",
          y: "value",
          z: "kind",
          layout: stack(),
          fill: (d) => kinds.find((k) => k.label === d.kind)!.fill,
          inset: 1,
        }),
      ],
      scales: {
        x: { scale: () => scaleBand<string>().padding(0.5) },
        y: {
          scale: scaleLinear,
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
          const ds = points.map((p) => p.datum as Bar).filter((d) => d.value > 0);
          const total = ds.reduce((sum, d) => sum + d.value, 0);
          return {
            title: `${(points[0]!.datum as Bar).year} · SEK`,
            rows: [
              ...ds.map((d) => ({
                label: d.kind,
                value: formatInteger(d.value),
                color: kinds.find((k) => k.label === d.kind)!.fill,
              })),
              ...(ds.length > 1
                ? [{ label: "Total", value: formatInteger(total), active: true }]
                : []),
            ],
          };
        },
      },
    });
  }, [rows, expected]);

  return (
    <div className="flex flex-col gap-2">
      <div className="sensitive h-56">
        <Chart
          definition={definition}
          ariaLabel="Dividends per year"
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
      <ul className="text-muted-foreground flex gap-4 text-xs">
        {kinds
          .filter((k) => k.label === kinds[0].label || expected > 0)
          .map((k) => (
            <li key={k.label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${k.dot}`} />
              {k.label === "Expected" ? "Expected rest of year" : k.label}
            </li>
          ))}
      </ul>
    </div>
  );
}
