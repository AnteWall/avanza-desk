import { describe, expect, it } from "vitest";

import { parseBlock } from "./blocks";

describe("parseBlock", () => {
  it("reads price, portfolio and instrument blocks", () => {
    expect(
      parseBlock("chart", '{"kind":"price","orderbookId":"5269","period":"one_month"}'),
    ).toEqual({ kind: "price", orderbookId: "5269", type: undefined, period: "one_month" });
    expect(parseBlock("chart", '{"kind":"portfolio","period":"THIS_YEAR","mode":"value"}')).toEqual(
      { kind: "portfolio", period: "THIS_YEAR", mode: "value" },
    );
    expect(parseBlock("instrument", '{"orderbookId":"5269","type":"STOCK"}')).toEqual({
      kind: "instrument",
      orderbookId: "5269",
      type: "STOCK",
    });
  });

  it("falls back to sane periods and rejects anything else", () => {
    expect(parseBlock("chart", '{"orderbookId":"5269","period":"forever"}')).toMatchObject({
      period: "one_year",
    });
    expect(parseBlock("chart", '{"orderbookId":"drop"}')).toBeUndefined();
    expect(parseBlock("chart", '{"orderbookId":"52')).toBeUndefined();
    expect(parseBlock("python", '{"orderbookId":"5269"}')).toBeUndefined();
  });
});
