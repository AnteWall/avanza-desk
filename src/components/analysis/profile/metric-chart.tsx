import { barY, defineChart, ruleY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatCompact, formatInteger } from "@/lib/format";
import { statusLabel, toneLabel, type Metric, type Period, type Tone } from "@/lib/trading-profile";

// Bars take the verdict's color, the same one its label wears.
const toneFill: Record<Tone, string> = {
  change: "var(--down)",
  watch: "var(--warning)",
  keep: "var(--up)",
};

/** A check's number per calendar year, colored by that year's verdict, with its cutoffs dashed. */
export function MetricChart({ history, metric }: { history: readonly Period[]; metric: Metric }) {
  const definition = useMemo(() => {
    // Oldest first; years with too few trades have no number to draw.
    const bars = history
      .filter((p) => p.value != null)
      .map((p) => ({
        year: p.label,
        value: p.value!,
        fill: p.tone ? toneFill[p.tone] : "var(--muted-foreground)",
        period: p,
      }))
      .reverse();
    return defineChart({
      marks: [
        barY(bars, { x: "year", y: "value", fill: (d) => d.fill, inset: 1 }),
        ruleY(metric.cutoffs, {
          stroke: "var(--muted-foreground)",
          strokeWidth: 1,
          strokeDasharray: "4 3",
        }),
      ],
      scales: {
        x: { scale: () => scaleBand<string>().padding(0.35) },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { ticks: { format: formatCompact } },
        },
      },
      tooltip: {
        use: tooltip,
        content: ([point]) => {
          const { year, fill, period } = point!.datum as (typeof bars)[number];
          return {
            title: year,
            color: fill,
            rows: [
              { label: metric.label, value: period.metric },
              {
                label: "Verdict",
                value: period.tone ? toneLabel[period.tone] : statusLabel[period.status],
              },
              { label: "Trades", value: formatInteger(period.sample) },
              { label: "Flagged", value: metric.cutoffText },
            ],
          };
        },
      },
    });
  }, [history, metric]);

  return (
    <Chart
      definition={definition}
      ariaLabel={`${metric.label} per year`}
      className="num text-muted-foreground text-xs"
      style={{ height: "100%" }}
    />
  );
}
