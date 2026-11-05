import { barY, defineChart, stack } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatAs, formatCompact, formatInteger } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { IncomeMonth } from "@/lib/income";

const series = [
  {
    key: "announced",
    label: m.analysis.income.announced,
    fill: "var(--chart-1)",
    dot: "bg-chart-1",
  },
  {
    key: "estimated",
    label: m.analysis.income.estimated,
    fill: "var(--chart-2)",
    dot: "bg-chart-2",
  },
] as const;

const label = (month: string) => formatAs(`${month}-01`, "MMM");

/** Expected dividends per month, announced stacked under estimated. */
export function IncomeChart({ months }: { months: readonly IncomeMonth[] }) {
  const definition = useMemo(() => {
    const bars = series.flatMap(({ key, label: kind }) =>
      months.map((m) => ({ month: label(m.month), ym: m.month, kind, value: m[key] })),
    );
    return defineChart({
      marks: [
        barY(bars, {
          x: "month",
          y: "value",
          z: "kind",
          layout: stack(),
          fill: (d) => series.find((s) => s.label === d.kind)!.fill,
          inset: 1,
        }),
      ],
      scales: {
        x: { scale: () => scaleBand<string>().padding(0.2) },
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
        // Your money: blurred in privacy mode like the rest of the income view.
        className: "sensitive",
        content: (points) => {
          const rows = points.map((p) => {
            const d = p.datum as (typeof bars)[number];
            const s = series.find((x) => x.label === d.kind)!;
            return { label: d.kind, value: formatInteger(d.value), color: s.fill };
          });
          const total = points.reduce(
            (sum, p) => sum + (p.datum as (typeof bars)[number]).value,
            0,
          );
          const ym = (points[0]!.datum as (typeof bars)[number]).ym;
          return {
            title: `${formatAs(`${ym}-01`, "MMMM yyyy")} · SEK`,
            rows: [...rows, { label: m.common.total, value: formatInteger(total), active: true }],
          };
        },
      },
    });
  }, [months]);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex gap-4 text-xs">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="h-48">
        <Chart
          definition={definition}
          ariaLabel={m.analysis.income.chart}
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
