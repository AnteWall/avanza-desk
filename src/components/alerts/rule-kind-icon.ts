import {
  Activity,
  ArrowDownRight,
  ChartPie,
  Crosshair,
  Landmark,
  Radar,
  Scale,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import type { RuleKind } from "@/lib/alert-rules";

/** One icon per rule kind, shared by the picker, menus and the rules table. */
export const ruleKindIcon: Record<RuleKind, LucideIcon> = {
  "day-move": Activity,
  signal: Radar,
  short: TrendingDown,
  upside: Crosshair,
  loss: ArrowDownRight,
  weight: ChartPie,
  drift: Scale,
  ltv: Landmark,
};
