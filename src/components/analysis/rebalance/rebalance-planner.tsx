import { cn } from "cn";
import { Bell, ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

import { RebalanceTable, type RebalanceRow } from "@/components/analysis/rebalance/rebalance-table";
import { Empty } from "@/components/common/empty";
import { GroupPicker } from "@/components/portfolio/holdings/group-picker";
import { useGroup } from "@/components/portfolio/holdings/use-groups";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatPercent, formatShare } from "@/lib/format";
import { rebalance, targetsKey } from "@/lib/rebalance";
import { openRuleDialog } from "@/lib/rule-dialog";
import { getSetting, saveSetting } from "@/lib/settings";

type Targets = Record<string, number>;

/**
 * Set a target share per holding (it starts at today's weight), optionally add new money, and
 * read off the trades. Targets are saved; the trades must be placed in Avanza. With a group
 * picked it rebalances within the group, against targets saved for that group (drift alerts
 * watch the whole portfolio's). Remount it when the group changes.
 */
export function RebalancePlanner() {
  const { holdings } = useHoldings({ grouped: true });
  const group = useGroup();
  const KEY = group ? `${targetsKey}:${group.id}` : targetsKey;
  const [targets, setTargets] = useState(() => getSetting<Targets>(KEY, {}));
  const [newMoney, setNewMoney] = useState(0);
  const [buyOnly, setBuyOnly] = useState(false);
  // Target inputs are uncontrolled; a reset remounts the table so they show the new values.
  const [resets, setResets] = useState(0);

  const held = holdings.filter((h) => h.value > 0);
  if (held.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="border-b p-3">
          <GroupPicker />
        </div>
        <Empty>{`No holdings${group ? ` in ${group.name}` : ""} to rebalance.`}</Empty>
      </div>
    );
  }
  const total = held.reduce((s, h) => s + h.value, 0);
  const saveTargets = (next: Targets) => {
    setTargets(next);
    void saveSetting(KEY, next);
  };
  const positions = held.map((h) => ({
    key: h.key,
    type: h.type,
    value: h.value,
    volume: h.volume,
    target: targets[h.key] ?? h.value / total,
  }));
  const trades = rebalance(positions, newMoney, buyOnly);
  const rows: RebalanceRow[] = held.map((holding, i) => ({
    holding,
    weight: holding.value / total,
    target: positions[i]!.target,
    trade: trades[i]!,
    setTarget: (t) => saveTargets({ ...targets, [holding.key]: t }),
  }));
  const reset = (next: Targets) => {
    saveTargets(next);
    setResets((n) => n + 1);
  };
  const sum = positions.reduce((s, p) => s + p.target, 0);
  const off = Math.abs(sum - 1) > 0.0005;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b p-3 text-xs">
        <GroupPicker />
        <label className="text-muted-foreground flex items-center gap-2">
          New money
          <Input
            type="number"
            min={0}
            step={1000}
            className="sensitive num h-7 w-32 text-right"
            value={newMoney || ""}
            placeholder="0"
            onChange={(e) => setNewMoney(Math.max(0, e.currentTarget.valueAsNumber || 0))}
          />
          SEK
        </label>
        <label className="text-muted-foreground flex items-center gap-2">
          <Switch size="sm" checked={buyOnly} onCheckedChange={setBuyOnly} />
          Buy only
        </label>
        <span className={cn("num", off ? "text-warning" : "text-muted-foreground")}>
          Targets sum to {formatShare(sum)}
          {off && ` (${formatPercent(sum - 1)} off)`}
        </span>
        <span className="text-muted-foreground ml-auto">
          AvanzaDesk can't place orders: enter these trades in Avanza.
        </span>
        <span className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
              <RotateCcw />
              Reset targets
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => reset({})}>To current weights</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => reset(Object.fromEntries(held.map((h) => [h.key, 1 / held.length])))}
              >
                To equal weights
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!group && (
            <Button variant="outline" size="xs" onClick={() => openRuleDialog({ kind: "drift" })}>
              <Bell />
              Alert on drift
            </Button>
          )}
        </span>
      </div>
      <RebalanceTable key={resets} rows={rows} />
    </div>
  );
}
