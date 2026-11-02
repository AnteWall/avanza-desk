import { crosshair, defineChart, lineY, ruleY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/common/skeleton";
import { LegendRow as Row } from "@/components/portfolio/intraday/legend-row";
import { LinePresets } from "@/components/portfolio/intraday/line-presets";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { getAccount } from "@/lib/account";
import { InstrumentType, TransactionSide } from "@/lib/avanza/codes";
import { toDealRow } from "@/lib/avanza/loose-records";
import { dealsQuery, headerIndicesQuery, priceChartQuery } from "@/lib/avanza/queries";
import type { ReturnPoint } from "@/lib/benchmark";
import { formatPercent } from "@/lib/format";
import { sinceClose, stockholmTime, weightedLine } from "@/lib/intraday";
import { getSetting, saveSetting } from "@/lib/settings";

const palette = [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`);
// Past five picked lines the colours repeat dashed.
const dashes = [undefined, "5 3", "1 3"];
const time = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short", timeZone: "Europe/Stockholm" });
const isOmxs30 = (name: string) => /OMXS30|OMX Stockholm 30/i.test(name);
const SETTING = "intraday-lines";
const TOP = 5;

type Line = { key: string; name: string; weight: number; points: ReturnPoint[] };
type Series = { key: string; label: string; points: ReturnPoint[]; stroke: string; dash?: string };
type Datum = ReturnPoint & { series: string; stroke: string };

const last = (l: { points: readonly ReturnPoint[] }) => l.points.at(-1)?.value;

/**
 * The latest session since the previous close: the portfolio weighted by yesterday's value,
 * OMXS30, and the holdings picked in the legend (the five largest by default). Avanza's "today"
 * chart is each instrument's last session, so holdings that haven't traded in the latest one
 * (US stocks before 15:30) count as unchanged. Today's deals count from their time and price.
 * Funds are left out: they price once a day.
 */
export function IntradayChart() {
  const { holdings } = useHoldings({ grouped: true });
  const listed = useMemo(
    () => holdings.filter((h) => h.orderbookId && h.type !== InstrumentType.Fund),
    [holdings],
  );
  const { data: indices } = useQuery(headerIndicesQuery);
  const { data: deals, isPending: dealsPending } = useQuery(dealsQuery);
  const fills = useMemo(() => {
    const account = getAccount();
    const rows = (deals?.deals.map(toDealRow) ?? []).flatMap((d) => {
      const timestamp = Date.parse(d.time ?? "");
      if (!d.orderbookId || !d.volume || d.price == null || Number.isNaN(timestamp)) return [];
      if (account && d.accountId && d.accountId !== account) return [];
      const volume = d.side === TransactionSide.Buy ? d.volume : -d.volume;
      return [{ id: d.orderbookId, timestamp, volume, price: d.price }];
    });
    return Map.groupBy(rows, (f) => f.id);
  }, [deals]);
  const omx = indices?.indexes.find((i) =>
    isOmxs30(`${i.link.shortLinkDisplay} ${i.link.linkDisplay}`),
  );
  const omxLabel = omx?.link.shortLinkDisplay || "OMXS30";
  const ids = [...listed.map((h) => h.orderbookId!), ...(omx ? [omx.link.orderbookId] : [])];
  // `combine` keeps the result stable until a chart changes, so the memos below hold.
  const { pending, charts } = useQueries({
    queries: ids.map((id) => ({ ...priceChartQuery(id, "today", false), refetchInterval: 60_000 })),
    combine: (results) => ({
      pending: results.some((r) => r.isPending),
      charts: results.map((r) => r.data),
    }),
  });

  const [picked, setPicked] = useState(() => getSetting<string[] | null>(SETTING, null));
  const [hovered, setHovered] = useState<string>();
  const pick = (keys: string[] | null) => {
    setPicked(keys);
    void saveSetting(SETTING, keys);
  };

  const { lines, index, portfolio, session } = useMemo(() => {
    const session = charts.reduce<string | undefined>(
      (latest, c) => (c && (!latest || c.to > latest) ? c.to : latest),
      undefined,
    );
    const ret = (i: number) => {
      const c = charts[i];
      const h = listed[i];
      const held = h && { volume: h.volume, fills: fills.get(h.orderbookId!) ?? [] };
      return c && c.to === session ? sinceClose(c.ohlc, c.previousClosingPrice, held) : [];
    };
    const lines: Line[] = listed.map((h, i) => ({
      key: h.key,
      name: h.name,
      weight: h.value - h.today,
      points: ret(i),
    }));
    return {
      lines,
      index: omx ? ret(listed.length) : [],
      portfolio: weightedLine(lines),
      session,
    };
  }, [charts, listed, omx, fills]);

  // `null` = the largest holdings that traded; otherwise the keys picked in the legend.
  const { shown, series } = useMemo(() => {
    const traded = lines.filter((l) => l.points.length > 0);
    const shown = new Set(picked ?? traded.slice(0, TOP).map((l) => l.key));
    const series: Series[] = traded
      .filter((l) => shown.has(l.key))
      .map((l, i) => ({
        key: l.key,
        label: l.name,
        points: l.points,
        stroke: palette[i % palette.length]!,
        dash: dashes[Math.floor(i / palette.length) % dashes.length],
      }));
    return { shown, series };
  }, [lines, picked]);

  const definition = useMemo(() => {
    const ts = [...series.flatMap((s) => s.points), ...index, ...portfolio].map((p) => p.timestamp);
    const line = (s: Series, width: number) =>
      lineY(
        s.points.map((p): Datum => ({ ...p, series: s.label, stroke: s.stroke })),
        {
          x: "timestamp",
          y: "value",
          stroke: s.stroke,
          strokeWidth: hovered === s.key ? width + 1 : width,
          strokeDasharray: s.dash,
          strokeOpacity: hovered && hovered !== s.key ? 0.2 : 1,
        },
      );
    return defineChart({
      marks: [
        crosshair({ x: { label: true }, y: { label: true }, strokeDasharray: "2 2" }),
        ruleY([0], { stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 3" }),
        ...series.map((s) => line(s, 1.5)),
        line(
          {
            key: "index",
            label: omxLabel,
            points: index,
            stroke: "var(--muted-foreground)",
            dash: "2 3",
          },
          1.5,
        ),
        line(
          { key: "portfolio", label: "Portfolio", points: portfolio, stroke: "var(--foreground)" },
          2.5,
        ),
      ],
      scales: {
        // The Stockholm session, stretched for anything trading outside it.
        x: {
          scale: scaleLinear().domain(
            session
              ? [
                  Math.min(stockholmTime(session, "09:00"), ...ts),
                  Math.max(stockholmTime(session, "17:30"), ...ts),
                ]
              : [0, 1],
          ),
          axis: { ticks: { format: (v: number) => time.format(v) } },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { ticks: { format: formatPercent } },
        },
      },
      clip: true,
      focus: "group-x",
      tooltip: {
        use: tooltip,
        content: (points) => {
          const data = points.map((p) => p.datum as Datum).sort((a, b) => b.value - a.value);
          return {
            title: data[0] ? time.format(data[0].timestamp) : "",
            rows: data.map((d) => ({
              label: d.series,
              value: formatPercent(d.value),
              color: d.stroke,
            })),
          };
        },
      },
    });
  }, [series, index, portfolio, session, hovered, omxLabel]);

  if (pending || dealsPending) return <Skeleton className="m-3 h-48 rounded-md opacity-60" />;
  if (!portfolio.length) return <p className="text-muted-foreground p-3">No trades today yet.</p>;

  const strokeOf = new Map(series.map((s) => [s.key, s.stroke]));
  const movers = lines
    .filter((l) => l.points.length > 0)
    .sort((a, b) => Math.abs(last(b)!) - Math.abs(last(a)!));
  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 p-3">
        <Chart
          definition={definition}
          ariaLabel="Holdings today since yesterday's close"
          className="num text-muted-foreground text-xs"
          style={{ height: "100%" }}
        />
      </div>
      <div className="flex w-60 shrink-0 flex-col border-l">
        <LinePresets
          shown={[...shown]}
          onPick={pick}
          top={TOP}
          movers={movers.slice(0, TOP).map((l) => l.key)}
        />
        <ul className="min-h-0 flex-1 overflow-auto py-1 text-xs">
          <Row
            label="Portfolio"
            swatch="var(--foreground)"
            value={last({ points: portfolio })}
            strong
          />
          {index.length > 0 && (
            <Row
              label={omxLabel}
              swatch="var(--muted-foreground)"
              value={last({ points: index })}
              dashed
            />
          )}
          <li aria-hidden className="border-border/60 mx-3 my-1 border-t" />
          {lines.map((l) => {
            const on = shown.has(l.key);
            return (
              <Row
                key={l.key}
                label={l.name}
                // Picked but not traded yet: no line, a muted swatch shows it's on.
                swatch={strokeOf.get(l.key) ?? (on ? "var(--muted-foreground)" : undefined)}
                value={last(l)}
                pressed={on}
                onHover={(over) => setHovered(over && on ? l.key : undefined)}
                onClick={() => pick(on ? [...shown].filter((k) => k !== l.key) : [...shown, l.key])}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
