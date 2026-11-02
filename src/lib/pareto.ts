import type { QueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { InstrumentType } from "@/lib/avanza/codes";
import { searchQuery } from "@/lib/avanza/queries";
import { toAdded, type AddedInstrument } from "@/lib/rebalance";

/** The feed behind the holdings table on paretosec.se/analystjanster/manadsportfolj. */
const url = "https://www.paretosec.se/rest-api/Infront%20token/maanedsportefolje";

/** Tickers in Pareto's current monthly portfolio (equal weights, as Pareto shows them). */
export function paretoTickers(json: string): string[] {
  const data = JSON.parse(json) as { positions?: { ticker?: string }[] };
  return (data.positions ?? []).flatMap((p) => p.ticker ?? []);
}

/**
 * Pareto's monthly portfolio as Avanza instruments. Each ticker resolves to the first Swedish
 * stock Avanza's search returns for it.
 */
// ponytail: first-hit ticker match; match on ISIN if Pareto's feed ever sends one.
export async function loadParetoPortfolio(qc: QueryClient): Promise<AddedInstrument[]> {
  const tickers = paretoTickers(await invoke<string>("article_fetch", { url }));
  if (!tickers.length) throw new Error("Pareto's portfolio came back empty.");
  return Promise.all(
    tickers.map(async (ticker) => {
      const hits = await qc.fetchQuery(searchQuery(ticker));
      const hit = hits.find((h) => h.type === InstrumentType.Stock && h.flagCode === "SE");
      if (!hit) throw new Error(`Couldn't find ${ticker} on Avanza.`);
      return toAdded(qc, hit);
    }),
  );
}
