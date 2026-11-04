import { DAY, NOW } from "./account-data";
import { rng, round, seedOf } from "./random";
import { STOCKS } from "./universe";

// Portfolio history the app keeps itself (snapshot_series in src-tauri/src/db.rs): 90 days of
// daily rows per stock, so Signals sees targets and recommendations change.

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Today's value of `kind` for a stock, and how far back it drifts from over 90 days. */
const KINDS: Record<
  string,
  (s: (typeof STOCKS)[number], r: () => number) => [now: number, drift: number]
> = {
  target: (s, r) => [s.price * (1.06 + r() * 0.22), (r() - 0.4) * 0.12],
  analysts: (_s, r) => [Math.round(8 + r() * 16), 0],
  consensus: (_s, r) => [0.35 + r() * 0.5, (r() - 0.5) * 0.3],
  owners: (s, r) => [Math.round(s.marketCap / 2e7 + r() * 40_000), (r() - 0.3) * 0.08],
  short: (_s, r) => [r() * 4.5, (r() - 0.5) * 0.6],
  price: (s) => [s.price, 0],
};

function series(kind: string, from: string): [string, string, number][] {
  const make = KINDS[kind];
  if (!make) return [];
  const rows: [string, string, number][] = [];
  for (const s of STOCKS) {
    const r = rng(seedOf(`${kind}-${s.orderbookId}`));
    const [now, drift] = make(s, r);
    for (let d = 90; d >= 0; d--) {
      const day = iso(NOW - d * DAY);
      if (day < from) continue;
      // Steps rather than a smooth line: analysts change targets now and then.
      const step = Math.floor((90 - d) / 15) / 6;
      const value = now / (1 + drift * (1 - step));
      rows.push([s.orderbookId, day, kind === "analysts" ? Math.round(value) : round(value, 4)]);
    }
  }
  return rows;
}

export function snapshotCommand(cmd: string, args: Record<string, unknown>): unknown {
  if (cmd === "snapshot_series") return series(args.kind as string, args.from as string);
  return undefined;
}
