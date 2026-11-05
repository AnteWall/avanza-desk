import { barY, defineChart, group } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Section } from "@/components/workspace/dossier/section";
import { stockAnalysisQuery } from "@/lib/avanza/queries";
import { formatCompact, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

type Bar = { year: string; metric: string; value: number };

const series = [
  { key: "sales", label: m.workspace.financials.sales, fill: "var(--chart-1)", dot: "bg-chart-1" },
  {
    key: "netProfit",
    label: m.workspace.financials.netProfit,
    fill: "var(--chart-2)",
    dot: "bg-chart-2",
  },
];
const YEARS = 8;

/** Sales and net profit per year, side by side, for the last eight years. */
export function FinancialsChart({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(stockAnalysisQuery(orderbookId));
  const byYear = data.companyFinancialsByYear;
  const margin = byYear.profitMargin?.at(-1);

  const definition = useMemo(() => {
    const bars: Bar[] = series.flatMap(({ key, label }) =>
      (byYear[key] ?? [])
        .slice(-YEARS)
        .map((p) => ({ year: String(p.financialYear), metric: label, value: p.value })),
    );
    return bars.length === 0
      ? null
      : defineChart({
          marks: [
            barY(bars, {
              x: "year",
              y: "value",
              z: "metric",
              layout: group(),
              fill: (d) => series.find((s) => s.label === d.metric)!.fill,
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
            content: (points) => {
              const bars = points.map((p) => p.datum as Bar);
              const value = (label: string) => bars.find((b) => b.metric === label)?.value;
              const sales = value(m.workspace.financials.sales);
              const profit = value(m.workspace.financials.netProfit);
              return {
                title: m.workspace.financials.year(bars[0]!.year),
                rows: [
                  ...bars.map((b) => ({
                    label: b.metric,
                    value: formatCompact(b.value),
                    color: series.find((s) => s.label === b.metric)!.fill,
                  })),
                  ...(sales && profit != null
                    ? [
                        {
                          label: m.workspace.financials.netMargin,
                          value: formatShare(profit / sales),
                        },
                      ]
                    : []),
                ],
              };
            },
          },
        });
  }, [byYear]);

  if (!definition) return null;
  return (
    <Section
      title={m.workspace.financials.title}
      aside={
        margin && m.workspace.financials.marginIn(formatShare(margin.value), margin.financialYear)
      }
    >
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex gap-4 text-xs">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          ))}
        </div>
        <div className="h-56">
          <Chart
            definition={definition}
            ariaLabel={m.workspace.financials.chart}
            className="num text-muted-foreground text-xs"
            style={{ height: "100%" }}
          />
        </div>
      </div>
    </Section>
  );
}
