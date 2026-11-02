import {
  areaY,
  crosshair,
  defineChart,
  dot,
  lineY,
  link,
  rect,
  ruleX,
  ruleY,
} from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import { OrderSide } from "@/lib/avanza/codes";
import { formatCompact, formatPercent, formatPrice } from "@/lib/format";

export type ChartPoint = { timestamp: number; value: number };
export type TradeMarker = { timestamp: number; price: number; side: OrderSide };
export type VolumeBar = { timestamp: number; volume: number };
export type Candle = { timestamp: number; open: number; high: number; low: number; close: number };
/** An indicator line drawn over the price, e.g. a moving average. */
export type OverlayLine = {
  key: string;
  label: string;
  color: string;
  points: readonly ChartPoint[];
};

/** Left margin when charts are stacked, so their x axes line up. */
export const STACKED_MARGIN = 64;

const noTrades: readonly TradeMarker[] = [];
const noVolumes: readonly VolumeBar[] = [];
const noEvents: readonly number[] = [];
const noOverlays: readonly OverlayLine[] = [];

const time = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short", timeZone: "Europe/Stockholm" });
const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });

/**
 * Value line over a brand-tinted area (prices, or % development for funds). Dashed rules:
 * previous close (muted) and the user's average price (brand). Dots: the user's own buys (up)
 * and sells (down). Volume bars fill the bottom fifth on their own hidden scale; dotted
 * verticals mark company events (reports, dividends). With `candles` the line becomes
 * up/down candlesticks; `overlays` add indicator lines.
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
  candles,
  overlays = noOverlays,
  stacked,
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
  candles?: readonly Candle[];
  overlays?: readonly OverlayLine[];
  /** A pane sits under this chart: use the shared left margin. */
  stacked?: boolean;
}) {
  const definition = useMemo(() => {
    const refs = [previousClose, averagePrice].filter((v): v is number => v != null);
    const baseline = Math.min(
      ...refs,
      ...(candles ? candles.map((c) => c.low) : points.map((p) => p.value)),
    );
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
    const bodies = (candles ?? []).map((c) => ({
      ...c,
      x1: c.timestamp - half,
      x2: c.timestamp + half,
      // A flat candle still gets a hairline body.
      top: c.close === c.open ? c.close * 1.0002 : c.close,
    }));
    const overlayMarks = overlays.map((o) =>
      lineY(
        o.points.map((p) => ({
          timestamp: p.timestamp,
          overlay: p.value,
          label: o.label,
          color: o.color,
        })),
        { x: "timestamp", y: "overlay", stroke: o.color, strokeWidth: 1 },
      ),
    );
    const priceMarks = candles
      ? ([true, false] as const).flatMap((rising) => {
          const color = rising ? "var(--up)" : "var(--down)";
          const side = (c: Candle) => c.close >= c.open === rising;
          return [
            link(candles.filter(side), {
              x1: "timestamp",
              x2: "timestamp",
              y1: "low",
              y2: "high",
              stroke: color,
              strokeWidth: 1,
            }),
            rect(bodies.filter(side), { x1: "x1", x2: "x2", y1: "open", y2: "top", fill: color }),
          ];
        })
      : [
          areaY(points, { x: "timestamp", y2: "value", y1: baseline, fill: "url(#price-fill)" }),
          lineY(points, { x: "timestamp", y: "value", stroke: "var(--brand)", strokeWidth: 1.5 }),
        ];
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
        ...priceMarks,
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
        ...overlayMarks,
        dot(
          inRange.filter((t) => t.side === OrderSide.Buy),
          { x: "timestamp", y: "price", r: 4, fill: "var(--up)", stroke: "var(--card)" },
        ),
        dot(
          inRange.filter((t) => t.side === OrderSide.Sell),
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
      ...(stacked ? { margin: { left: STACKED_MARGIN } } : {}),
      focus: "group-x",
      tooltip: {
        use: tooltip,
        content: (hovered) => {
          // The group mixes marks; tell them apart by their datum's shape.
          const data = hovered.map((p) => p.datum as Record<string, number | string>);
          const candle = data.find((d) => "open" in d && "x1" in d) as Candle | undefined;
          const line =
            (data.find((d) => "value" in d) as ChartPoint | undefined) ??
            (candle && { timestamp: candle.timestamp, value: candle.close });
          const lines = data.filter((d) => "overlay" in d) as {
            overlay: number;
            label: string;
            color: string;
          }[];
          const volume = data.find((d) => "y2" in d) as { y2: number } | undefined;
          const marks = data.filter((d) => "side" in d) as TradeMarker[];
          return {
            title: line ? format(line.timestamp) : "",
            rows: [
              ...(candle
                ? (["open", "high", "low", "close"] as const).map((k) => ({
                    label: k[0]!.toUpperCase() + k.slice(1),
                    value: formatValue(candle[k]),
                    color: k === "close" ? "var(--brand)" : undefined,
                  }))
                : []),
              ...(line && !candle
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
              ...lines.map((l) => ({
                label: l.label,
                value: formatValue(l.overlay),
                color: l.color,
              })),
              ...(volume ? [{ label: "Volume", value: formatCompact(volume.y2) }] : []),
              ...marks.map((t) => ({
                label: t.side === OrderSide.Buy ? "You bought" : "You sold",
                value: formatPrice(t.price),
                color: t.side === OrderSide.Buy ? "var(--up)" : "var(--down)",
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
    candles,
    overlays,
    stacked,
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
