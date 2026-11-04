import { useSuspenseQuery } from "@tanstack/react-query";
import type { OverviewChartResponse } from "avanza-ts";
import { cn } from "cn";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import world from "@/assets/world.svg";
import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Flash } from "@/components/common/flash";
import { worldIndicesQuery } from "@/lib/avanza/queries";
import { type Exchange, exchanges, exchangeStatus, getShownExchanges } from "@/lib/exchanges";
import { formatAs, formatClock, formatDate } from "@/lib/format";
import { nightPath, subsolarPoint } from "@/lib/sun";

// world.svg is Natural Earth 110m land, equirectangular, cropped to these latitudes.
const NORTH = 84;
const SOUTH = -58;
const x = (lon: number) => `${((lon + 180) / 360) * 100}%`;
const y = (lat: number) => `${((NORTH - lat) / (NORTH - SOUTH)) * 100}%`;

/** "17:30" today, else "Mon 09:00", in Stockholm time like the status bar. */
const when = (next: Date, now: Date) =>
  formatDate(next) === formatDate(now) ? formatClock(next) : formatAs(next, "EEE HH:mm");

const statusText = (ex: Exchange, now: Date) => {
  const { open, next } = exchangeStatus(ex, now);
  return `${open ? "Open · closes" : "Closed · opens"} ${when(next, now)}`;
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * The hovered exchange, with a short grace on leave so crossing empty map from one dot to the
 * next doesn't flash the default cards back in between.
 */
function useHover() {
  const [id, setId] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const set = (next?: string) => {
    clearTimeout(timer.current);
    if (next) setId(next);
    else timer.current = setTimeout(() => setId(undefined), 150);
  };
  return [id, set] as const;
}

type Row = { chart: OverviewChartResponse; ex: Exchange | undefined; change: number | null };

const col = dataTableColumns<Row>();
const columns = (now: Date) =>
  col.columns([
    col.accessor((r) => r.chart.shortName, {
      id: "index",
      header: "Index",
      cell: (c) => (
        <span className="flex items-center gap-1.5" title={c.row.original.chart.name}>
          <CountryFlag code={c.row.original.chart.orderbook.countryCode} />
          <span className="font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate">{c.row.original.chart.name}</span>
        </span>
      ),
    }),
    col.accessor((r) => r.ex?.name ?? "", {
      id: "market",
      header: "Market",
      cell: (c) => {
        const ex = c.row.original.ex;
        if (!ex) return <span className="text-muted-foreground">–</span>;
        const { open } = exchangeStatus(ex, now);
        const Icon = open ? Sun : Moon;
        return (
          <span
            className="text-muted-foreground flex items-center gap-1.5"
            title={`${ex.name}. Regular hours; holidays not included.`}
          >
            <Icon className={cn("size-3.5", open && "text-brand")} aria-hidden />
            <span className="num">{statusText(ex, now)}</span>
          </span>
        );
      },
    }),
    col.accessor("change", {
      header: "Today",
      cell: (c) =>
        c.getValue() == null ? (
          "–"
        ) : (
          <Flash value={c.getValue()}>
            <Change ratio={c.getValue()!} />
          </Flash>
        ),
      meta: { align: "end" },
    }),
  ]);

/**
 * Every index on Avanza's market overview: a faded world map with the night side shaded, a dot
 * per exchange (mint while open) and cards with the indices of the status bar's exchanges, or
 * only the hovered one; under it a table of all indices with each market's hours.
 * Suspends while loading.
 */
export function WorldMap() {
  const { data } = useSuspenseQuery(worldIndicesQuery);
  const now = useNow();
  const [sunLat, sunLon] = subsolarPoint(now);
  const rows: Row[] = data.map((chart) => {
    const { closingPrice, lastPrice } = chart.orderbook;
    return {
      chart,
      // shortcut: one exchange per country; an index from a country not in `exchanges` shows no hours.
      ex: exchanges.find((e) => e.country === chart.orderbook.countryCode?.toUpperCase()),
      change: closingPrice && lastPrice != null ? lastPrice / closingPrice - 1 : null,
    };
  });
  const listed = exchanges.filter((ex) => rows.some((r) => r.ex === ex));
  // The status bar's exchanges (Stockholm and the US unless changed in Settings) show their
  // indices; hovering or focusing a dot, or a row in the table, shows only that one, so cards
  // never overlap.
  const [hovered, setHovered] = useHover();
  const shown = hovered ? [hovered] : getShownExchanges();

  return (
    // The map stays put; only the table below scrolls.
    <div className="flex h-full flex-col">
      <div className="relative m-3 aspect-[360/142] shrink-0">
        <div
          aria-hidden
          className="bg-muted-foreground/30 absolute inset-0"
          style={{ mask: `url(${world}) center / 100% 100% no-repeat` }}
        />
        <svg
          aria-hidden
          viewBox={`0 0 360 ${NORTH - SOUTH}`}
          preserveAspectRatio="none"
          className="fill-foreground/[0.06] dark:fill-background/45 absolute inset-0 size-full"
        >
          <path d={nightPath(now, NORTH, SOUTH)} />
        </svg>
        <Sun
          aria-hidden
          className="text-muted-foreground absolute size-3.5 -translate-1/2"
          style={{ left: x(sunLon), top: y(sunLat) }}
        />
        {listed.map((ex) => {
          const { open } = exchangeStatus(ex, now);
          const Icon = open ? Sun : Moon;
          // Cards open toward open sea: Americas and Asia to the left of the dot, so the US
          // card stays clear of Europe and Asia's stays on the map; Europe to the right.
          const left = ex.at[1] < -30 || ex.at[1] > 60;
          return (
            <div
              key={ex.short}
              style={{ left: x(ex.at[1]), top: y(ex.at[0]) }}
              className={cn(
                "absolute",
                ex.short === hovered ? "z-20" : shown.includes(ex.short) && "z-10",
              )}
              onMouseEnter={() => setHovered(ex.short)}
              onMouseLeave={() => setHovered(undefined)}
            >
              <button
                type="button"
                aria-label={`${ex.name}: ${statusText(ex, now)}`}
                onFocus={() => setHovered(ex.short)}
                onBlur={() => setHovered(undefined)}
                className="focus-visible:ring-ring flex size-4 -translate-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-transform duration-150 motion-reduce:transition-none",
                    open ? "bg-brand ring-brand/30 ring-2" : "bg-muted-foreground",
                    ex.short === hovered && "scale-150",
                  )}
                />
              </button>
              {shown.includes(ex.short) && (
                <div
                  className={cn(
                    // Enters like the app's popovers: a 100ms fade, growing out of the dot.
                    "bg-popover ring-foreground/10 absolute -top-3.5 rounded-lg py-1 whitespace-nowrap shadow-md ring-1",
                    "animate-in fade-in-0 duration-100 motion-safe:zoom-in-95",
                    left
                      ? "right-3 origin-top-right motion-safe:slide-in-from-right-2"
                      : "left-3 origin-top-left motion-safe:slide-in-from-left-2",
                  )}
                >
                  <div className="text-muted-foreground mb-1 flex items-center gap-1.5 border-b px-2 pb-1 text-xs">
                    <Icon className={cn("size-3.5", open && "text-brand")} aria-hidden />
                    <span className="text-foreground font-medium">{ex.name}</span>
                    <span className="num">{statusText(ex, now)}</span>
                  </div>
                  <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 px-2">
                    {rows
                      .filter((r) => r.ex === ex)
                      .map((r) => (
                        <li
                          key={r.chart.id}
                          title={r.chart.name}
                          className="col-span-3 grid h-6 grid-cols-subgrid items-center"
                        >
                          <CountryFlag code={r.chart.orderbook.countryCode} />
                          <span className="font-medium">{r.chart.shortName}</span>
                          <span className="text-right">
                            {r.change == null ? (
                              "–"
                            ) : (
                              <Flash value={r.change}>
                                <Change ratio={r.change} />
                              </Flash>
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        <div className="text-muted-foreground pointer-events-none absolute bottom-0 left-0 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-brand size-1.5 rounded-full" /> Open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground size-1.5 rounded-full" /> Closed
          </span>
          <span>Point at a market to see its indices</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border-t">
        <DataTable
          columns={columns(now)}
          data={rows}
          getRowId={(r) => r.chart.id}
          onRowHover={(r) => setHovered(r?.ex?.short)}
        />
      </div>
    </div>
  );
}
