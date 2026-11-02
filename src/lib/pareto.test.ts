import { describe, expect, it } from "vitest";

import { paretoTickers } from "@/lib/pareto";

describe("paretoTickers", () => {
  it("reads tickers from Pareto's positions feed", () => {
    const json = JSON.stringify({
      positions: [{ ticker: "ABB", feed: 11 }, { ticker: "SAND" }, {}],
    });
    expect(paretoTickers(json)).toEqual(["ABB", "SAND"]);
    expect(paretoTickers("{}")).toEqual([]);
  });
});
