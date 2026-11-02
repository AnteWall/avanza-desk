import {
  Bell,
  Briefcase,
  History,
  ChartLine,
  LayoutGrid,
  ListOrdered,
  Newspaper,
  Radar,
  Scale,
  Sigma,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";

/** The app's pages in nav-rail order; Alt+1…9, then Alt+0, open them in this order too. */
export const pages: {
  icon: typeof Bell;
  label: string;
  to: keyof FileRoutesByTo;
  /** One line on what the page is for, shown when hovering its nav button. */
  description: string;
}[] = [
  {
    icon: History,
    label: "Since last visit",
    to: "/briefing",
    description:
      "What changed while you were away: moves, trades, dividends, alerts and what's next.",
  },
  {
    icon: LayoutGrid,
    label: "Workspace",
    to: "/",
    description: "Watchlists, charts, order book and a full dossier on the instrument in focus.",
  },
  {
    icon: Briefcase,
    label: "Portfolio",
    to: "/portfolio",
    description: "Your holdings, accounts, performance, dividends and transactions.",
  },
  {
    icon: ChartLine,
    label: "Markets",
    to: "/markets",
    description: "Indices, today's gainers and losers, and a stock screener.",
  },
  {
    icon: ListOrdered,
    label: "Orders",
    to: "/orders",
    description: "Open orders, today's trades, stop-losses and fund orders.",
  },
  {
    icon: Newspaper,
    label: "News",
    to: "/news",
    description: "News on what you hold and watch, with upcoming reports and dividends.",
  },
  {
    icon: Bell,
    label: "Alerts",
    to: "/alerts",
    description: "Your Avanza price and news alerts, and AvanzaDesk's own rules.",
  },
  {
    icon: Radar,
    label: "Signals",
    to: "/signals",
    description: "Insider trades, short interest, owners and analyst changes in your stocks.",
  },
  {
    icon: Sigma,
    label: "Analysis",
    to: "/analysis",
    description: "Benchmark, income, tax and fees, fund overlap and your trading habits.",
  },
  {
    icon: Scale,
    label: "Rebalance",
    to: "/rebalance",
    description: "Set target weights and get the orders that reach them.",
  },
];

/** The digit that opens the page at `index` with Alt: 1…9, then 0 for the tenth. */
export const pageDigit = (index: number) => String((index + 1) % 10);
