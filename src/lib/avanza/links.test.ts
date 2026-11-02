import { avanzaOrderUrl, slug, tickAt } from "./links";

test("builds Avanza slugs and order URLs", () => {
  expect(slug("Hennes & Mauritz B")).toBe("hennes-mauritz-b");
  expect(slug("Öresund Ä")).toBe("oresund-a");
  expect(avanzaOrderUrl("5247", "Investor B", "sell", false)).toBe(
    "https://www.avanza.se/handla/order.html/salj/5247/investor-b",
  );
  expect(avanzaOrderUrl("5247", "Investor B", "buy", false, 25)).toBe(
    "https://www.avanza.se/handla/order.html/kop/5247/investor-b?volume=25",
  );
  expect(avanzaOrderUrl("1", "Fond X", "sell", true, 5)).toBe(
    "https://www.avanza.se/handla/fonder.html/salj/1/fond-x",
  );
});

test("finds the tick size for a price", () => {
  const table = [
    { min: 0, max: 99.99, tick: 0.01 },
    { min: 100, max: 499.9, tick: 0.1 },
  ];
  expect(tickAt(table, 50)).toBe(0.01);
  expect(tickAt(table, 120)).toBe(0.1);
  expect(tickAt(table, 1000)).toBeUndefined();
});
