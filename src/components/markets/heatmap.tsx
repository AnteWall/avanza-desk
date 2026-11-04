import { cn } from "cn";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import { formatPercent } from "@/lib/format";
import { squarify, type Rect } from "@/lib/treemap";

export type HeatTile = {
  id: string;
  name: string;
  /** Short name shown on the tile ("VOLV B"). */
  ticker: string;
  isin?: string;
  /** Tiles group under their sector; without any, the map is one group. */
  sector?: string;
  /** Tile area, e.g. market cap. */
  weight: number;
  change: number | null;
};

/** The day change (a ratio) where a tile's color is fully saturated. */
const FULL = 0.03;
/** Sector label strip and the gutter between sectors, in px. */
const HEADER = 20;
const GUTTER = 3;

// Strength of the up/down tint over the card, so ±0.2 % reads faint and ±3 % strong. Capped
// at 70 % so text keeps 4.5:1 on the strongest tile in both themes.
const tint = (change: number | null) => {
  if (change == null || change === 0) return "var(--muted)";
  const strength = Math.round(20 + Math.min(Math.abs(change) / FULL, 1) * 50);
  return `color-mix(in oklab, var(${change > 0 ? "--up" : "--down"}) ${strength}%, var(--card))`;
};

// How much a tile can show: big ones get a logo, ticker and change; the smallest only color.
const tier = ({ w, h }: Rect) =>
  w >= 150 && h >= 130
    ? "xl"
    : w >= 90 && h >= 88
      ? "lg"
      : w >= 56 && h >= 38
        ? "md"
        : w >= 26 && h >= 26
          ? "sm"
          : "xs";

/**
 * Treemap of an index: one block per sector (biggest first, labelled), each split into its
 * members sized by `weight` and colored by today's change (blue up, red down, deeper the bigger
 * the move). Every tile is a button: hover, click, Tab + Enter focus the stock.
 */
export function Heatmap({
  tiles,
  onPick,
}: {
  tiles: readonly HeatTile[];
  onPick: (tile: HeatTile) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sectors = useMemo(() => {
    const groups = new Map<string, HeatTile[]>();
    for (const t of tiles) {
      const group = groups.get(t.sector ?? "Other") ?? [];
      group.push(t);
      groups.set(t.sector ?? "Other", group);
    }
    const labelled = groups.size > 1;
    const blocks = [...groups].map(([name, members]) => ({
      name,
      members,
      weight: members.reduce((sum, t) => sum + t.weight, 0),
    }));
    return squarify(blocks, (b) => b.weight, { x: 0, y: 0, ...size }).map((block) => {
      const header = labelled && block.h > HEADER * 2 ? HEADER : 0;
      const inner = {
        x: block.x + GUTTER / 2,
        y: block.y + header + GUTTER / 2,
        w: block.w - GUTTER,
        h: block.h - header - GUTTER,
      };
      return { ...block, header, tiles: squarify(block.item.members, (t) => t.weight, inner) };
    });
  }, [tiles, size]);

  return (
    <div ref={ref} className="relative h-full min-h-72 w-full overflow-hidden">
      {sectors.map((s) => (
        <div key={s.item.name}>
          {s.header > 0 && (
            <span
              className="text-muted-foreground absolute truncate px-1 text-xs leading-5 font-medium"
              style={{ left: s.x + GUTTER / 2, top: s.y + GUTTER / 2, width: s.w - GUTTER }}
              title={s.item.name}
            >
              {s.item.name}
            </span>
          )}
          {s.tiles.map((t) => (
            <Tile key={t.item.id} rect={t} tile={t.item} onPick={onPick} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({
  rect,
  tile,
  onPick,
}: {
  rect: Rect;
  tile: HeatTile;
  onPick: (tile: HeatTile) => void;
}) {
  const size = tier(rect);
  const change = tile.change == null ? "–" : formatPercent(tile.change);
  return (
    <button
      type="button"
      aria-label={`${tile.name} ${change}`}
      title={`${tile.name} ${change}`}
      onClick={() => onPick(tile)}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: tint(tile.change),
      }}
      // The 1px card-colored border is the gap between tiles.
      className="border-card focus-visible:ring-ring absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm border px-1 text-center outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-inset"
    >
      {(size === "xl" || size === "lg" || size === "sm") && (
        <InstrumentLogo
          isin={tile.isin}
          name={tile.name}
          className={cn(
            "rounded-full",
            size === "xl" ? "mb-1 size-12" : size === "lg" ? "mb-0.5 size-8" : "size-5",
          )}
        />
      )}
      {size !== "sm" && size !== "xs" && (
        <>
          <span
            className={cn(
              "w-full truncate font-semibold",
              size === "xl" ? "text-3xl" : size === "lg" ? "text-lg leading-tight" : "text-xs",
            )}
          >
            {tile.ticker}
          </span>
          <span
            className={cn("num", size === "xl" ? "text-lg" : size === "lg" ? "text-sm" : "text-xs")}
          >
            {change}
          </span>
        </>
      )}
    </button>
  );
}
