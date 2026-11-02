/** Avanza's URL slug for a name: "Atlas Copco A" → "atlas-copco-a", "Hennes & Mauritz B" → "hennes-mauritz-b". */
export function slug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Avanza's own order page for an instrument, since avanza-ts can't place orders.
 * `volume` prefills the share count (Avanza's order page reads `?volume=`; price always comes
 * from its live quote). The fund order page reads no prefill params, so funds ignore it.
 * shortcut: URL patterns copied from avanza.se by hand.
 */
export function avanzaOrderUrl(
  orderbookId: string,
  name: string,
  side: "buy" | "sell",
  fund: boolean,
  volume?: number,
) {
  const url = `https://www.avanza.se/handla/${fund ? "fonder" : "order"}.html/${side === "buy" ? "kop" : "salj"}/${orderbookId}/${slug(name)}`;
  return volume && !fund ? `${url}?volume=${volume}` : url;
}

/** The tick size that applies at `price`, from an instrument's tick size table. */
export function tickAt(
  entries: readonly { min: number; max: number; tick: number }[],
  price: number,
) {
  return entries.find((e) => price >= e.min && price <= e.max)?.tick;
}
