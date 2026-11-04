// Shots of the market side: the workspace, Markets, Signals.
export const marketShots = [
  // 1Y: Saab's run reads better than a day flattened by the "your average price" line.
  { name: "workspace", path: "/", themes: ["dark", "light"], run: `await click("1Y");` },
  // Markets opens on gainers beside the OMXS30 heatmap.
  { name: "markets", path: "/markets" },
  { name: "markets-world", path: "/markets", run: `await click("World");` },
  { name: "markets-trending", path: "/markets", run: `await click("Trending");` },
  { name: "signals", path: "/signals" },
];
