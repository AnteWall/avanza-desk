import type { Dividend, UpcomingDividend } from "avanza-ts";

import type { Holding } from "@/lib/avanza/portfolio";

/** One month of expected dividend income in SEK; `month` is yyyy-MM. */
export type IncomeMonth = { month: string; announced: number; estimated: number };

export type IncomeRow = {
  holding: Holding;
  announced: number;
  estimated: number;
  income: number;
  /** Next 12 months' income over what you paid; null without a known cost. */
  yieldOnCost: number | null;
  /** Per-share dividends last 12 months over the 12 before, minus 1; null without both. */
  growth: number | null;
};

type Payment = { isin: string; date: string; perShare: number };

const DAY = 24 * 60 * 60_000;
// An announced dividend this close to a projected one is the same payout, now confirmed.
const SAME_PAYOUT = 60 * DAY;

const day = (date: string) => date.slice(0, 10);
const shiftYears = (date: string, years: number) =>
  `${Number(date.slice(0, 4)) + years}${date.slice(4, 10)}`;

/** Avanza lists each payout once per account; per-share amounts are the same, so keep one. */
function unique(payments: Payment[]) {
  const byKey = new Map(payments.map((p) => [`${p.isin}:${p.date}`, p]));
  return [...byKey.values()];
}

/**
 * Dividend income over the 12 months from `today` (yyyy-MM-dd), for the volumes held now:
 * announced dividends, plus last year's payouts repeated a year later where nothing is
 * announced yet. Amounts in SEK.
 */
export function forecastIncome(
  holdings: readonly Holding[],
  upcoming: readonly UpcomingDividend[],
  paid: readonly Dividend[],
  today: string,
): { months: IncomeMonth[]; rows: IncomeRow[] } {
  const end = shiftYears(today, 1);
  const announced = unique(
    upcoming.map((u) => ({ isin: u.isin, date: day(u.date), perShare: u.amountPerShareInSek })),
  ).filter((p) => p.date >= today && p.date < end);
  const history = unique(
    paid
      .filter((d) => !d.stockRedemptionPayment)
      .map((d) => ({ isin: d.isin, date: day(d.date), perShare: d.amountPerShareInSek })),
  );
  const yearAgo = shiftYears(today, -1);
  const twoYearsAgo = shiftYears(today, -2);
  const projected = history
    .filter((p) => p.date >= yearAgo && p.date < today)
    .map((p) => ({ ...p, date: shiftYears(p.date, 1) }))
    .filter(
      (p) =>
        p.date >= today &&
        !announced.some(
          (a) =>
            a.isin === p.isin && Math.abs(Date.parse(a.date) - Date.parse(p.date)) < SAME_PAYOUT,
        ),
    );

  const months: IncomeMonth[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    return { month: d.toISOString().slice(0, 7), announced: 0, estimated: 0 };
  });
  const rows: IncomeRow[] = [];
  const sum = (ps: Payment[]) => ps.reduce((s, p) => s + p.perShare, 0);

  for (const holding of holdings) {
    if (!holding.isin) continue;
    const mine = (ps: Payment[]) => ps.filter((p) => p.isin === holding.isin);
    let a = 0;
    let e = 0;
    for (const [list, kind] of [
      [mine(announced), "announced"],
      [mine(projected), "estimated"],
    ] as const) {
      for (const p of list) {
        const amount = p.perShare * holding.volume;
        const m = months.find((m) => m.month === p.date.slice(0, 7));
        if (m) m[kind] += amount;
        if (kind === "announced") a += amount;
        else e += amount;
      }
    }
    const past = mine(history);
    const last = sum(past.filter((p) => p.date >= yearAgo && p.date < today));
    const prior = sum(past.filter((p) => p.date >= twoYearsAgo && p.date < yearAgo));
    if (a + e === 0 && last === 0) continue;
    rows.push({
      holding,
      announced: a,
      estimated: e,
      income: a + e,
      yieldOnCost: holding.cost > 0 ? (a + e) / holding.cost : null,
      growth: prior > 0 && last > 0 ? last / prior - 1 : null,
    });
  }
  rows.sort((x, y) => y.income - x.income);
  return { months, rows };
}
