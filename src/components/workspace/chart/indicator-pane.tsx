import { crosshair, defineChart, lineY, rect, ruleY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { STACKED_MARGIN } from "@/components/common/price-chart";
import type { LowerPane } from "@/lib/chart-view";
import { formatDecimal } from "@/lib/format";
import { macd, rsi } from "@/lib/indicators";

const time = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short", timeZone: "Europe/Stockholm" });
const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });

type Point = { timestamp: number; v: number; label: string };

const points = (ts: readonly number[], series: (number | null)[], label: string): Point[] =>
  series.flatMap((v, i) => (v == null ? [] : [{ timestamp: ts[i]!, v, label }]));

/**
 * RSI (with 30/70 bands) or MACD (line, signal, histogram) under the price chart, on the
 * same time axis and left margin so the two line up.
 */
export function IndicatorPane({
  bars,
  kind,
  intraday,
}: {
  bars: readonly { timestamp: number; close: number }[];
  kind: Exclude<LowerPane, "none">;
  intraday: boolean;
}) {
  const definition = useMemo(() => {
    const ts = bars.map((b) => b.timestamp);
    const closes = bars.map((b) => b.close);
    const format = intraday ? time.format : date.format;
    const half = bars.length > 1 ? ((ts.at(-1)! - ts[0]!) / (bars.length - 1)) * 0.35 : 0;
    const x = {
      // The price chart's volume bars widen its domain by half a bar on each side.
      scale: scaleLinear().domain([(ts[0] ?? 0) - half, (ts.at(-1) ?? 1) + half]),
      axis: false as const,
    };

    const marks =
      kind === "rsi"
        ? [
            ruleY([30, 70], {
              stroke: "var(--muted-foreground)",
              strokeWidth: 1,
              strokeDasharray: "4 3",
            }),
            lineY(points(ts, rsi(closes), "RSI 14"), {
              x: "timestamp",
              y: "v",
              stroke: "var(--brand)",
              strokeWidth: 1.25,
            }),
          ]
        : (() => {
            const m = macd(closes);
            const hist = m.histogram.flatMap((v, i) =>
              v == null
                ? []
                : [{ x1: ts[i]! - half, x2: ts[i]! + half, y1: 0, y2: v, label: "Histogram" }],
            );
            return [
              ruleY([0], { stroke: "var(--muted-foreground)", strokeWidth: 1 }),
              ...([true, false] as const).map((up) =>
                rect(
                  hist.filter((d) => d.y2 >= 0 === up),
                  {
                    x1: "x1",
                    x2: "x2",
                    y1: "y1",
                    y2: "y2",
                    fill: up ? "var(--up)" : "var(--down)",
                    fillOpacity: 0.5,
                  },
                ),
              ),
              lineY(points(ts, m.line, "MACD"), {
                x: "timestamp",
                y: "v",
                stroke: "var(--brand)",
                strokeWidth: 1.25,
              }),
              lineY(points(ts, m.signal, "Signal"), {
                x: "timestamp",
                y: "v",
                stroke: "var(--chart-3)",
                strokeWidth: 1,
              }),
            ];
          })();

    return defineChart({
      marks: [
        crosshair({ x: { label: false }, y: { label: true }, strokeDasharray: "2 2" }),
        ...marks,
      ],
      scales: {
        x,
        y: {
          scale: kind === "rsi" ? scaleLinear().domain([0, 100]) : scaleLinear,
          nice: kind !== "rsi",
          grid: false,
          axis: { ticks: { format: formatDecimal, count: 3 } },
        },
      },
      margin: { left: STACKED_MARGIN },
      clip: true,
      focus: "group-x",
      tooltip: {
        use: tooltip,
        content: (hovered) => {
          const data = hovered.map((p) => p.datum as Partial<Point & { x1: number; y2: number }>);
          const at = data.find((d) => d.timestamp != null)?.timestamp;
          return {
            title: at != null ? format(at) : "",
            rows: data.map((d) => ({
              label: d.label ?? "",
              value: formatDecimal(d.v ?? d.y2 ?? 0),
            })),
          };
        },
      },
    });
  }, [bars, kind, intraday]);

  return (
    <Chart
      definition={definition}
      ariaLabel={kind === "rsi" ? "RSI chart" : "MACD chart"}
      className="num text-muted-foreground text-xs"
      style={{ height: "100%" }}
    />
  );
}
