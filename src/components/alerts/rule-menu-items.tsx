import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { ruleKindIcon } from "@/components/alerts/rule-kind-icon";
import { ContextMenuGroup, ContextMenuItem, ContextMenuLabel } from "@/components/ui/context-menu";
import type { ContextItem } from "@/lib/ai/context";
import { ruleKinds, type RuleKind } from "@/lib/alert-rules";
import { InstrumentType } from "@/lib/avanza/codes";
import { aggregateHoldings } from "@/lib/avanza/portfolio";
import { allPositionsQuery } from "@/lib/avanza/queries";
import { openRuleDialog } from "@/lib/rule-dialog";

/**
 * "Alert me" entries in an instrument's right-click menu: the rule kinds that make sense for
 * it (stock rules for stocks, holding rules for what you hold), each opening the rule dialog
 * with the instrument filled in.
 */
export function RuleMenuItems({ item }: { item: Extract<ContextItem, { kind: "instrument" }> }) {
  const { data: positions } = useQuery(allPositionsQuery);
  const held = positions
    ? aggregateHoldings(positions).some((h) => h.orderbookId === item.id)
    : false;
  // Rows that don't know their type are listed instruments; the dialog shows missing values.
  const stock = !item.type || item.type === InstrumentType.Stock;
  // Funds have no live price, so price levels are for listed instruments.
  const listed = item.type !== InstrumentType.Fund;
  const kinds: RuleKind[] = [
    ...(listed ? (["price"] as const) : []),
    ...(stock || held ? (["day-move"] as const) : []),
    ...(stock ? (["signal", "short", "upside"] as const) : []),
    ...(held ? (["loss", "weight"] as const) : []),
  ];
  const target = { id: item.id, name: item.name, type: item.type };
  return (
    <ContextMenuGroup>
      <ContextMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Bell className="size-3" aria-hidden />
        Alert me
      </ContextMenuLabel>
      {kinds.map((kind) => {
        const Icon = ruleKindIcon[kind];
        return (
          <ContextMenuItem key={kind} onClick={() => openRuleDialog({ kind, target })}>
            <Icon />
            {ruleKinds[kind].label}…
          </ContextMenuItem>
        );
      })}
      {kinds.length === 0 && (
        <ContextMenuItem onClick={() => openRuleDialog({ target })}>Choose a rule…</ContextMenuItem>
      )}
    </ContextMenuGroup>
  );
}
