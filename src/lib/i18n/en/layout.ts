export const layout = {
  pages: {
    home: {
      label: "Home",
      description:
        "How your portfolio is doing: today, or what changed while you were away, and what's next.",
    },
    workspace: {
      label: "Workspace",
      description: "Watchlists, charts, order book and a full dossier on the instrument in focus.",
    },
    portfolio: {
      label: "Portfolio",
      description: "Your holdings, accounts, performance, dividends and transactions.",
    },
    markets: {
      label: "Markets",
      description: "Indices, today's gainers and losers, and a stock screener.",
    },
    orders: {
      label: "Orders",
      description: "Open orders, today's trades, stop-losses and fund orders.",
    },
    news: {
      label: "News",
      description: "News on what you hold and watch, with upcoming reports and dividends.",
    },
    alerts: {
      label: "Alerts",
      description: "Your Avanza price and news alerts, and AvanzaDesk's own rules.",
    },
    signals: {
      label: "Signals",
      description: "Insider trades, short interest, owners and analyst changes in your stocks.",
    },
    analysis: {
      label: "Analysis",
      description: "Benchmark, income, tax and fees, fund overlap and your trading habits.",
    },
    rebalance: {
      label: "Rebalance",
      description: "Set target weights and get the orders that reach them.",
    },
  },
  nav: {
    hideNames: "Hide page names",
    showNames: "Show page names",
    collapse: "Collapse",
  },
  settingsMenu: {
    theme: "Theme",
    themes: { light: "Light", dark: "Dark", system: "System" },
    whatsNew: "What's new",
    suggestFeature: "Suggest a feature",
    signOut: "Sign out",
  },
  accounts: { all: "All accounts", one: "One account" },
  dailyPerformance: {
    changeToday: "Your portfolio's change today",
    changeOn: (session: string) => `Your portfolio's change on the last trading day (${session})`,
    what: "today's performance",
  },
  indices: "indices",
  history: { back: "Back", forward: "Forward" },
  privacy: { show: "Show amounts", hide: "Hide amounts" },
  search: {
    button: "Search instruments…",
    title: "Search instruments",
    placeholder: "Search stocks, funds, ETFs…",
    results: "Results",
    what: "search results",
    goTo: (page: string) => `Go to ${page}`,
    newAlertRule: "New alert rule",
    nothing: (query: string) => `Nothing matches “${query}”.`,
    navigate: "navigate",
    open: "open",
    close: "close",
  },
  exchange: (name: string, open: boolean, when: string, left: string) =>
    `${name} ${open ? "open · closes" : "closed · opens"} ${when} (in ${left}). Regular hours; holidays not included.`,
  statusBar: {
    market: "Market",
    closesIn: (time: string, left: string) => `open · closes ${time} · in ${left}`,
    closed: "closed",
    realTime: "Real-time",
    delayed: "Delayed",
    github: "AvanzaDesk on GitHub",
    star: "Star AvanzaDesk on GitHub",
    offline: "Offline",
    unreachable: "Can't reach Avanza",
    connecting: "Connecting…",
    updatedSeconds: (s: number) => `Updated ${s}s ago`,
    updatedMinutes: (min: number) => `Updated ${min} min ago`,
  },
  window: { minimize: "Minimize", maximize: "Maximize", restore: "Restore" },
  updates: {
    available: (version: string) => `AvanzaDesk v${version} is available`,
    restart: "Restart to update",
    downloading: (version: string) => `Downloading v${version}…`,
    failed: "Update failed",
  },
  whatsNew: {
    since: (count: number, version: string) => `${count} updates since v${version}`,
  },
  liveQuotes: {
    writeFailed: "Couldn't write the live quotes file",
    columns: {
      id: "Orderbook id",
      change: "Change %",
      bid: "Bid",
      ask: "Ask",
      updated: "Updated",
    },
  },
  notify: {
    filled: "Order filled",
    bought: "Bought",
    sold: "Sold",
    at: (price: string) => ` at ${price}`,
    level: (price: string) => ` at ${price}`,
    alert: "Alert triggered",
    stopLoss: "Stop-loss",
    newStatus: "new",
  },
};
