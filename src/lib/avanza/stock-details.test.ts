import type { InsiderTrade } from "avanza-ts";

import { insiderFlow, periodReturns, reportText, vsAverage } from "./stock-details";

test("reportText drops citation markers and tags", () => {
  expect(reportText("Sales grew 8%<sup>2</sup>. <b>Strong</b> quarter<sup>13</sup>.")).toBe(
    "Sales grew 8%. Strong quarter.",
  );
});

test("periodReturns compares the last price with each known closing price", () => {
  const closing = { oneWeek: 100, oneMonth: 0, startDate: "1982-06-14" };
  const periods = [
    { label: "1W", key: "oneWeek" },
    { label: "1M", key: "oneMonth" },
    { label: "Max", key: "startDate" },
    { label: "1Y", key: "oneYear" },
  ];
  const returns = periodReturns(110, closing, periods);
  expect(returns.map((r) => r.label)).toEqual(["1W"]);
  expect(returns[0]!.ratio).toBeCloseTo(0.1);
});

test("vsAverage is null unless both values are positive", () => {
  expect(vsAverage(13, 10)).toBeCloseTo(0.3);
  expect(vsAverage(-5, 10)).toBeNull();
  expect(vsAverage(5, null)).toBeNull();
});

test("insiderFlow sums signed values since a date in the first trade's currency", () => {
  const trade = (transactionDate: string, totalValue: number, currency = "USD") =>
    ({ transactionDate, totalValue, currency }) as InsiderTrade;
  const flow = insiderFlow(
    [
      trade("2026-10-20", -300),
      trade("2026-10-10", 100),
      trade("2026-09-01", 50, "SEK"),
      trade("2026-01-01", -999),
    ],
    "2026-08-01",
  );
  expect(flow).toEqual({ buys: 2, sells: 1, net: -200, currency: "USD" });
});
