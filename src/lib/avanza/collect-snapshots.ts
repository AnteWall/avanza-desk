import type { QueryClient } from "@tanstack/react-query";
import type { StockQuote } from "avanza-ts";

import type { SnapshotRow } from "@/lib/snapshots";

import { aggregateHoldings } from "./portfolio";
import {
  allPositionsQuery,
  creditInfoQuery,
  fundamentalsQuery,
  quoteQuery,
  universeQuery,
} from "./queries";

type Fundamentals = Awaited<
  ReturnType<NonNullable<ReturnType<typeof fundamentalsQuery>["queryFn"]>>
>;

/** One stock's snapshot rows from its fundamentals and quote; missing sources are skipped. */
export function stockRows(id: string, f: Fundamentals, quote?: StockQuote | null): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  const add = (kind: SnapshotRow["kind"], value: number | null | undefined) => {
    if (value != null && Number.isFinite(value)) rows.push({ kind, key: id, value });
  };
  add("short", f.shorts?.shortSellingHistory.at(-1)?.ratio);
  if (f.targets?.numberOfEstimates) {
    add("target", f.targets.averagePriceTarget);
    add("analysts", f.targets.numberOfEstimates);
  }
  const r = f.recommendations;
  if (r) {
    const buy = r.numberOfBuy + r.numberOfOutperform;
    const total = buy + r.numberOfHold + r.numberOfSell + r.numberOfUnderperform;
    if (total) add("consensus", buy / total);
  }
  add("owners", f.owners?.ownersPoints.at(-1)?.numberOfOwners);
  add("price", quote?.last);
  return rows;
}

// Spaces requests out: the API is unofficial and one pass touches every held and watched stock.
const pause = () => new Promise((r) => setTimeout(r, 250));

/** Today's rows for every held or watched stock, portfolio weights and credit loan-to-value. */
export async function collectSnapshots(client: QueryClient): Promise<SnapshotRow[]> {
  const rows: SnapshotRow[] = [];
  const holdings = aggregateHoldings(await client.fetchQuery(allPositionsQuery));
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  if (total > 0)
    for (const h of holdings) rows.push({ kind: "weight", key: h.key, value: h.value / total });

  for (const s of await client.fetchQuery(universeQuery)) {
    const [f, quote] = await Promise.all([
      client.fetchQuery(fundamentalsQuery(s.orderbookId)).catch(() => null),
      client.fetchQuery(quoteQuery(s.orderbookId)).catch(() => null),
    ]);
    if (f) rows.push(...stockRows(s.orderbookId, f, quote));
    await pause();
  }

  // Accounts without credit answer with an error or an empty list; either way no rows.
  const credit = await client.fetchQuery(creditInfoQuery).catch(() => null);
  for (const c of credit?.creditInfos ?? [])
    if (c.creditLimit > 0) rows.push({ kind: "ltv", key: c.accountId, value: c.currentLtv });
  return rows;
}
