import { formatPercent } from "@/lib/format";

export type HeatTile = { id: string; name: string; change: number | null };

/** The day change (a ratio) where a tile's color is fully saturated. */
const FULL = 0.03;

// Strength of the up/down tint over the card, so ±0.2 % reads faint and ±3 % strong.
const tint = (change: number | null) => {
  if (change == null || change === 0) return "var(--muted)";
  const strength = Math.round(15 + Math.min(Math.abs(change) / FULL, 1) * 60);
  return `color-mix(in oklab, var(${change > 0 ? "--up" : "--down"}) ${strength}%, var(--card))`;
};

/**
 * Equal tiles colored by today's change: blue up, red down, deeper the bigger the move. A
 * grid rather than a treemap: with equal sizes every tile keeps its label, truncated when
 * narrow, and each is a button (hover, click, Tab + Enter focus the stock).
 */
export function Heatmap({
  tiles,
  onPick,
}: {
  tiles: readonly HeatTile[];
  onPick: (tile: HeatTile) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-0.5">
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.name}${t.change == null ? "" : ` ${formatPercent(t.change)}`}`}
          onClick={() => onPick(t)}
          style={{ background: tint(t.change) }}
          className="focus-visible:ring-ring hover:ring-foreground/40 flex h-12 min-w-0 flex-col items-center justify-center rounded-sm px-1.5 transition-shadow outline-none hover:ring-2 focus-visible:ring-2"
        >
          <span className="w-full truncate text-center text-xs font-medium">{t.name}</span>
          <span className="num text-xs">{t.change == null ? "–" : formatPercent(t.change)}</span>
        </button>
      ))}
    </div>
  );
}
