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
 * Avanza's own order page for an instrument, since avanza-ts can't place orders. Funds open
 * the fund page, which has the buy/sell buttons.
 * shortcut: URL patterns copied from avanza.se by hand; quantity can't be prefilled.
 */
export function avanzaOrderUrl(
  orderbookId: string,
  name: string,
  side: "buy" | "sell",
  fund: boolean,
) {
  return fund
    ? `https://www.avanza.se/fonder/om-fonden.html/${orderbookId}/${slug(name)}`
    : `https://www.avanza.se/handla/order.html/${side === "buy" ? "kop" : "salj"}/${orderbookId}/${slug(name)}`;
}

/** The tick size that applies at `price`, from an instrument's tick size table. */
export function tickAt(
  entries: readonly { min: number; max: number; tick: number }[],
  price: number,
) {
  return entries.find((e) => price >= e.min && price <= e.max)?.tick;
}
