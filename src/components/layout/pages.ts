import {
  Bell,
  Briefcase,
  House,
  ChartLine,
  LayoutGrid,
  ListOrdered,
  Newspaper,
  Radar,
  Scale,
  Sigma,
} from "lucide-react";

import { m } from "@/lib/i18n";
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
    icon: House,
    label: m.layout.pages.home.label,
    to: "/briefing",
    description: m.layout.pages.home.description,
  },
  {
    icon: LayoutGrid,
    label: m.layout.pages.workspace.label,
    to: "/",
    description: m.layout.pages.workspace.description,
  },
  {
    icon: Briefcase,
    label: m.layout.pages.portfolio.label,
    to: "/portfolio",
    description: m.layout.pages.portfolio.description,
  },
  {
    icon: ChartLine,
    label: m.layout.pages.markets.label,
    to: "/markets",
    description: m.layout.pages.markets.description,
  },
  {
    icon: ListOrdered,
    label: m.layout.pages.orders.label,
    to: "/orders",
    description: m.layout.pages.orders.description,
  },
  {
    icon: Newspaper,
    label: m.layout.pages.news.label,
    to: "/news",
    description: m.layout.pages.news.description,
  },
  {
    icon: Bell,
    label: m.layout.pages.alerts.label,
    to: "/alerts",
    description: m.layout.pages.alerts.description,
  },
  {
    icon: Radar,
    label: m.layout.pages.signals.label,
    to: "/signals",
    description: m.layout.pages.signals.description,
  },
  {
    icon: Sigma,
    label: m.layout.pages.analysis.label,
    to: "/analysis",
    description: m.layout.pages.analysis.description,
  },
  {
    icon: Scale,
    label: m.layout.pages.rebalance.label,
    to: "/rebalance",
    description: m.layout.pages.rebalance.description,
  },
];

/** The digit that opens the page at `index` with Alt: 1…9, then 0 for the tenth. */
export const pageDigit = (index: number) => String((index + 1) % 10);
