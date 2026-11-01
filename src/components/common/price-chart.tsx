import { areaY, crosshair, defineChart, dot, lineY, rect, ruleX, ruleY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { formatCompact, formatPercent, formatPrice } from "@/lib/format";

export type ChartPoint = { timestamp: number; value: number };
export type TradeMarker = { timestamp: number; price: number; side: "buy" | "sell" };
export type VolumeBar = { timestamp: number; volume: number };

const noTrades: readonly TradeMarker[] = [];
const noVolumes: readonly VolumeBar[] = [];
const noEvents: readonly number[] = [];

const time = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short", timeZone: "Europe/Stockholm" });
const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Value line over a brand-tinted area (prices, or % development for funds). Dashed rules:
 * previous close (muted) and the user's average price (brand). Dots: the user's own buys (up)
 * and sells (down). Volume bars fill the bottom fifth on their own hidden scale; dotted
 * verticals mark company events (reports, dividends).
 */
export function PriceChart({
  points,
  intraday,
  formatValue = formatPrice,
  valueLabel = "Price",
  previousClose,
  averagePrice,
  trades = noTrades,
  volumes = noVolumes,
  events = noEvents,
}: {
  points: readonly ChartPoint[];
  intraday: boolean;
  formatValue?: (value: number) => string;
  /** What the line is, for the tooltip: "Price", "Development", "Value". */
  valueLabel?: string;
  previousClose?: number | null;
  averagePrice?: number;
  trades?: readonly TradeMarker[];
  volumes?: readonly VolumeBar[];
  /** Event timestamps. */
  events?: readonly number[];
}) {
  const definition = useMemo(() => {
    const refs = [previousClose, averagePrice].filter((v): v is number => v != null);
    const baseline = Math.min(...refs, ...points.map((p) => p.value));
    const from = points[0]?.timestamp ?? 0;
    const inRange = trades.filter((t) => t.timestamp >= from);
    const format = intraday ? time.format : date.format;
    const to = points.at(-1)?.timestamp ?? 0;
    const maxVolume = Math.max(1, ...volumes.map((v) => v.volume));
    // Bars take ~70% of the average spacing between points.
    const half = points.length > 1 ? ((to - from) / (points.length - 1)) * 0.35 : 0;
    const bars = volumes.map((v) => ({
      x1: v.timestamp - half,
      x2: v.timestamp + half,
      y1: 0,
      y2: v.volume,
    }));
    return defineChart({
      marks: [
        crosshair({ x: { label: true }, y: { label: true }, strokeDasharray: "2 2" }),
        rect(bars, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          yScale: "volume",
          fill: "var(--muted-foreground)",
          fillOpacity: 0.25,
        }),
        ruleX(
          events.filter((t) => t >= from && t <= to),
          { stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "1 3" },
        ),
        areaY(points, { x: "timestamp", y2: "value", y1: baseline, fill: "url(#price-fill)" }),
        ruleY(previousClose != null ? [previousClose] : [], {
          stroke: "var(--muted-foreground)",
          strokeWidth: 1,
          strokeDasharray: "4 3",
        }),
        ruleY(averagePrice != null ? [averagePrice] : [], {
          stroke: "var(--brand)",
          strokeWidth: 1,
          strokeDasharray: "2 3",
        }),
        lineY(points, { x: "timestamp", y: "value", stroke: "var(--brand)", strokeWidth: 1.5 }),
        dot(
          inRange.filter((t) => t.side === "buy"),
          { x: "timestamp", y: "price", r: 4, fill: "var(--up)", stroke: "var(--card)" },
        ),
        dot(
          inRange.filter((t) => t.side === "sell"),
          { x: "timestamp", y: "price", r: 4, fill: "var(--down)", stroke: "var(--card)" },
        ),
      ],
      scales: {
        x: { scale: scaleLinear, axis: { ticks: { format: (v: number) => format(v) } } },
        y: { scale: scaleLinear, nice: true, grid: true, axis: { ticks: { format: formatValue } } },
        // Five times the top volume, so the tallest bar reaches a fifth of the height.
        volume: { scale: scaleLinear().domain([0, maxVolume * 5]), channel: "y", axis: false },
      },
      gradients: [
        {
          id: "price-fill",
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0, color: "var(--brand)", opacity: 0 },
            { offset: 1, color: "var(--brand)", opacity: 0.35 },
          ],
        },
      ],
      clip: true,
      focus: "group-x",
      tooltip: {
        use: tooltip,
        content: (hovered) => {
          // The group mixes marks; tell them apart by their datum's shape.
          const data = hovered.map((p) => p.datum as Record<string, number | string>);
          const line = data.find((d) => "value" in d) as ChartPoint | undefined;
          const volume = data.find((d) => "y2" in d) as { y2: number } | undefined;
          const marks = data.filter((d) => "side" in d) as TradeMarker[];
          return {
            title: line ? format(line.timestamp) : "",
            rows: [
              ...(line
                ? [{ label: valueLabel, value: formatValue(line.value), color: "var(--brand)" }]
                : []),
              // Zero is a baseline for % series (funds, returns), not a price to compare with.
              ...(line && previousClose
                ? [{ label: "Since close", value: formatPercent(line.value / previousClose - 1) }]
                : []),
              ...(line && averagePrice
                ? [
                    {
                      label: "Vs your average",
                      value: formatPercent(line.value / averagePrice - 1),
                    },
                  ]
                : []),
              ...(volume ? [{ label: "Volume", value: formatCompact(volume.y2) }] : []),
              ...marks.map((t) => ({
                label: t.side === "buy" ? "You bought" : "You sold",
                value: formatPrice(t.price),
                color: t.side === "buy" ? "var(--up)" : "var(--down)",
              })),
            ],
          };
        },
      },
    });
  }, [
    points,
    intraday,
    formatValue,
    valueLabel,
    previousClose,
    averagePrice,
    trades,
    volumes,
    events,
  ]);

  return (
    <Chart
      definition={definition}
      ariaLabel="Price chart"
      className="num text-muted-foreground text-xs"
      style={{ height: "100%" }}
    />
  );
}
