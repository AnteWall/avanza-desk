import type { InsiderTrade } from "avanza-ts";

/**
 * The parts of Avanza's `/market-guide/stock/{id}/details` the dossier reads. avanza-ts has no
 * typed stock version of `instrumentDetails`; fields Avanza leaves out stay optional.
 */
export type StockDetails = {
  company?: {
    description?: string;
    ceo?: string;
    chairman?: string;
    homepage?: string;
    totalNumberOfShares?: number;
  };
  companyOwners?: {
    owners: readonly { name: string; percentOfCapital: number; percentOfVotes: number }[];
    updated: string;
  };
  dividends?: { events: readonly Dividend[]; pastEvents: readonly Dividend[] };
  companyReports?: readonly {
    reportPeriodAndYear: { reportPeriod: string; financialYear: number };
    companyReportSummary?: { summary: string; highlights?: readonly string[] };
  }[];
};

export type Dividend = {
  exDate: string;
  paymentDate?: string;
  amount: number;
  currencyCode: string;
  dividendType: string;
};

/** Avanza's report summaries cite sources with `<sup>1</sup>`; plain text drops them. */
export const reportText = (html: string) =>
  html
    .replace(/<sup>.*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();

/** Return over each period from the closing price back then to `last`. Skips unknown periods. */
export function periodReturns(
  last: number,
  closing: Readonly<Record<string, number | string>>,
  periods: readonly { label: string; key: string }[],
) {
  return periods.flatMap(({ label, key }) => {
    const then = closing[key];
    return typeof then === "number" && then > 0 ? [{ label, ratio: last / then - 1 }] : [];
  });
}

/** `latest` against `average` as a ratio (0.31 = 31 % above), or null when not comparable. */
export const vsAverage = (latest: number | null | undefined, average: number | null | undefined) =>
  latest != null && average != null && latest > 0 && average > 0 ? latest / average - 1 : null;

/**
 * Insider buying and selling since `since` (ISO date). Avanza signs sells negative, so `net` is
 * the signed sum; trades in another currency than the first are left out of it.
 */
export function insiderFlow(trades: readonly InsiderTrade[], since: string) {
  const recent = trades.filter((t) => t.transactionDate >= since);
  const currency = recent[0]?.currency ?? "";
  return {
    buys: recent.filter((t) => t.totalValue > 0).length,
    sells: recent.filter((t) => t.totalValue < 0).length,
    net: recent.filter((t) => t.currency === currency).reduce((sum, t) => sum + t.totalValue, 0),
    currency,
  };
}
