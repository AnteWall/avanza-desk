import { barY, defineChart, stack } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatCompact } from "@/lib/format";
import type { IncomeMonth } from "@/lib/income";

const series = [
  { key: "announced", label: "Announced", fill: "var(--chart-1)", dot: "bg-chart-1" },
  { key: "estimated", label: "Estimated", fill: "var(--chart-2)", dot: "bg-chart-2" },
] as const;

const monthName = new Intl.DateTimeFormat("sv-SE", { month: "short", timeZone: "UTC" });
const label = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`));

/** Expected dividends per month, announced stacked under estimated. */
export function IncomeChart({ months }: { months: readonly IncomeMonth[] }) {
  const definition = useMemo(() => {
    const bars = series.flatMap(({ key, label: kind }) =>
      months.map((m) => ({ month: label(m.month), kind, value: m[key] })),
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
      tooltip,
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
          ariaLabel="Dividend income per month"
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
