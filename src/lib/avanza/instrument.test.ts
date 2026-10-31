import { AvanzaHttpError } from "avanza-ts";

import { avanza } from "./client";
import { loadInstrument } from "./instrument";

vi.mock("./client", () => ({
  avanza: {
    market: { stock: vi.fn<() => Promise<unknown>>(), etf: vi.fn<() => Promise<unknown>>() },
    funds: { guide: vi.fn<() => Promise<unknown>>() },
  },
}));

const notFound = Object.create(AvanzaHttpError.prototype) as AvanzaHttpError;

test("loadInstrument probes stock, then ETF, then fund when the type is unknown", async () => {
  vi.mocked(avanza.market.stock).mockRejectedValue(notFound);
  vi.mocked(avanza.market.etf).mockRejectedValue(notFound);
  vi.mocked(avanza.funds.guide).mockResolvedValue({
    name: "Global Fund",
    isin: "SE0000000001",
    currency: "SEK",
  } as never);

  const instrument = await loadInstrument("42");
  expect(instrument).toMatchObject({ kind: "fund", name: "Global Fund", isin: "SE0000000001" });
  expect(avanza.market.etf).toHaveBeenCalled();
});

test("loadInstrument rethrows non-HTTP errors instead of probing on", async () => {
  vi.mocked(avanza.market.stock).mockRejectedValue(new TypeError("offline"));
  await expect(loadInstrument("42")).rejects.toThrow("offline");
});

test("loadInstrument probes when the type code is unknown", async () => {
  vi.mocked(avanza.market.stock).mockResolvedValue({
    name: "Volvo B",
    isin: "SE0000115446",
    listing: { shortName: "VOLV B", currency: "SEK", countryCode: "SE", marketPlaceName: "Sthlm" },
  } as never);
  expect(await loadInstrument("5269", "SOMETHING_NEW")).toMatchObject({
    kind: "listed",
    shortName: "VOLV B",
  });
});
