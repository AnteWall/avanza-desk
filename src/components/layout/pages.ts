import {
  Bell,
  Briefcase,
  ChartLine,
  LayoutGrid,
  ListOrdered,
  Newspaper,
  Radar,
  Scale,
  Sigma,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";

/** The app's pages in nav-rail order; Alt+1… opens them in this order too. */
export const pages: { icon: typeof Bell; label: string; to: keyof FileRoutesByTo }[] = [
  { icon: LayoutGrid, label: "Workspace", to: "/" },
  { icon: Briefcase, label: "Portfolio", to: "/portfolio" },
  { icon: ChartLine, label: "Markets", to: "/markets" },
  { icon: ListOrdered, label: "Orders", to: "/orders" },
  { icon: Newspaper, label: "News", to: "/news" },
  { icon: Bell, label: "Alerts", to: "/alerts" },
  { icon: Radar, label: "Signals", to: "/signals" },
  { icon: Sigma, label: "Analysis", to: "/analysis" },
  { icon: Scale, label: "Rebalance", to: "/rebalance" },
];
