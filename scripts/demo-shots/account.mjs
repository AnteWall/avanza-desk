// Shots of the portfolio side: Home, Portfolio, Analysis, Rebalance, Orders.
// Each: { name, path, themes?, settings?, run?, settle? } — see demo-screenshots.mjs.
const tab = (label) => `await click(${JSON.stringify(label)}, "[role=tab]");`;

export const accountShots = [
  // "Since last visit": the demo seeds briefing:since three days back (src/lib/demo/account.ts).
  { name: "home", path: "/briefing", themes: ["dark", "light"] },
  { name: "portfolio", path: "/portfolio" },
  { name: "analysis", path: "/analysis", run: tab("Benchmark") },
  { name: "analysis-years", path: "/analysis", run: tab("Years") },
  { name: "analysis-income", path: "/analysis", run: tab("Income") },
  { name: "analysis-tax", path: "/analysis", run: tab("Tax & fees") },
  { name: "analysis-overlap", path: "/analysis", run: tab("Fund overlap") },
  { name: "analysis-profile", path: "/analysis", run: tab("Trading profile") },
  { name: "rebalance", path: "/rebalance" },
  { name: "orders", path: "/orders" },
];
