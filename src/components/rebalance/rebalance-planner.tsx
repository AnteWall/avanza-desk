import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Bell, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAssistantEnabled } from "@/components/ai/use-assistant-enabled";
import { InfoTip } from "@/components/common/info-tip";
import { Segmented } from "@/components/common/segmented";
import { GroupPicker } from "@/components/portfolio/holdings/group-picker";
import { AddInstrument } from "@/components/rebalance/add-instrument";
import { BuyingPowerMenu } from "@/components/rebalance/buying-power-menu";
import { OrdersTable } from "@/components/rebalance/orders-table";
import { PlanCheck } from "@/components/rebalance/plan-check";
import { PlanField } from "@/components/rebalance/plan-field";
import { PlanStep } from "@/components/rebalance/plan-step";
import { TargetsTable } from "@/components/rebalance/targets-table";
import { UnitInput } from "@/components/rebalance/unit-input";
import { useRebalancePlan } from "@/components/rebalance/use-rebalance-plan";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { askAssistant } from "@/lib/ai/ask";
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatShare,
  parseDecimal,
} from "@/lib/format";
import { m } from "@/lib/i18n";
import { loadParetoPortfolio } from "@/lib/pareto";
import { subscribeSuggestedTargets, takeSuggestedTargets } from "@/lib/rebalance";
import { openRuleDialog } from "@/lib/rule-dialog";

// A product name: the same in every language.
const PARETO = "Pareto månadsportfölj";

const modes = [
  { label: m.rebalance.modes.full, value: "full" },
  { label: m.rebalance.modes.buy, value: "buy" },
] as const;

/**
 * Plan a rebalance in three steps: what to rebalance and with how much new money, the target
 * share of each instrument (add ones you don't own yet), then the orders that get there. With a
 * group picked it rebalances within the group. Remount it when the group changes.
 */
export function RebalancePlanner() {
  const plan = useRebalancePlan();
  const queryClient = useQueryClient();
  const assistant = useAssistantEnabled();
  // Target inputs are uncontrolled; changing every target at once remounts the table.
  const [version, setVersion] = useState(0);
  const replaceTargets = (apply: () => void) => {
    apply();
    setVersion((n) => n + 1);
  };
  // Targets the assistant suggested: take them on arrival (or on mount, after navigating here).
  // Resubscribes every render so it applies against the current plan.
  useEffect(() => {
    const take = () => {
      const s = takeSuggestedTargets();
      if (s) replaceTargets(() => plan.applyPreset(s.preset, s.weights));
    };
    take();
    return subscribeSuggestedTargets(take);
  });

  const orders = plan.rows.flatMap((r) => r.order ?? []);
  const sold = orders.filter((o) => o.amount < 0);
  const sells = -sold.reduce((s, o) => s + o.amount, 0);
  const buys = orders.reduce((s, o) => s + Math.max(o.amount, 0), 0);
  const cashLeft = plan.newMoney + sells - buys;
  const off = Math.abs(plan.targetSum - 1) > 0.0005;

  return (
    <>
      <header className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{m.rebalance.title}</h1>
          <p className="text-muted-foreground">{m.rebalance.intro}</p>
        </div>
        {assistant && (
          <Button
            variant="outline"
            size="xs"
            className="ml-auto shrink-0"
            onClick={() =>
              askAssistant({
                items: [],
                prompt: m.rebalance.askPrompt,
              })
            }
          >
            <Sparkles />
            {m.rebalance.ask}
          </Button>
        )}
        {!plan.group && (
          <Button
            variant="outline"
            size="xs"
            className={cn("shrink-0", !assistant && "ml-auto")}
            onClick={() => openRuleDialog({ kind: "drift" })}
          >
            <Bell />
            {m.rebalance.alertOnDrift}
          </Button>
        )}
      </header>

      <PlanStep
        step={1}
        title={m.rebalance.setup.title}
        description={m.rebalance.setup.description}
      >
        <div className="grid grid-cols-5 gap-4 p-3">
          <PlanField label={m.rebalance.setup.holdings} tip={m.rebalance.setup.holdingsTip}>
            <GroupPicker />
          </PlanField>
          <PlanField label={m.rebalance.setup.newMoney} tip={m.rebalance.setup.newMoneyTip}>
            <span className="flex gap-1">
              <span className="min-w-0 flex-1">
                <UnitInput
                  unit="SEK"
                  aria-label={m.rebalance.setup.newMoneyAria}
                  type="number"
                  min={0}
                  step={1000}
                  className={cn(plan.newMoney > 0 && "sensitive")}
                  value={plan.newMoney || ""}
                  placeholder="0"
                  onChange={(e) =>
                    plan.setNewMoney(Math.max(0, e.currentTarget.valueAsNumber || 0))
                  }
                />
              </span>
              <BuyingPowerMenu onPick={plan.setNewMoney} />
            </span>
          </PlanField>
          <PlanField
            label={m.rebalance.setup.mode}
            tip={
              <>
                <p>
                  {m.rebalance.setup.fullTip(
                    <span key="mode" className="font-medium">
                      {m.rebalance.modes.full}
                    </span>,
                  )}
                </p>
                <p>
                  {m.rebalance.setup.buyTip(
                    <span key="mode" className="font-medium">
                      {m.rebalance.modes.buy}
                    </span>,
                  )}
                </p>
              </>
            }
          >
            <Segmented
              label={m.rebalance.setup.mode}
              className="h-7 self-start"
              options={modes}
              value={plan.buyOnly ? "buy" : "full"}
              onChange={(mode) => plan.setBuyOnly(mode === "buy")}
            />
          </PlanField>
          <PlanField label={m.rebalance.setup.tolerance} tip={m.rebalance.setup.toleranceTip}>
            <UnitInput
              unit="%"
              aria-label={m.rebalance.setup.toleranceAria}
              inputMode="decimal"
              defaultValue={formatDecimal(plan.band * 100)}
              onChange={(e) => {
                const v = parseDecimal(e.currentTarget.value);
                if (Number.isFinite(v))
                  plan.setOption({ band: Math.min(Math.max(v, 0), 50) / 100 });
              }}
            />
          </PlanField>
          <PlanField label={m.rebalance.setup.minOrder} tip={m.rebalance.setup.minOrderTip}>
            <UnitInput
              unit="SEK"
              aria-label={m.rebalance.setup.minOrderAria}
              inputMode="numeric"
              defaultValue={formatDecimal(plan.minOrder)}
              onChange={(e) => {
                const v = parseDecimal(e.currentTarget.value);
                if (Number.isFinite(v)) plan.setOption({ minOrder: Math.max(v, 0) });
              }}
            />
          </PlanField>
        </div>
      </PlanStep>

      <PlanStep
        step={2}
        title={m.rebalance.targets.title}
        description={m.rebalance.targets.description}
        actions={
          <>
            <AddInstrument inPlan={plan.inPlan} onAdd={plan.add} />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
                <RotateCcw />
                {m.rebalance.targets.menu}
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{m.rebalance.targets.reset}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => replaceTargets(() => plan.setTargets({}))}>
                    {m.rebalance.targets.toCurrent}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => replaceTargets(plan.equalTargets)}>
                    {m.rebalance.targets.toEqual}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1">
                    {m.rebalance.targets.models}
                    <InfoTip label={m.rebalance.targets.modelsLabel}>
                      {m.rebalance.targets.modelsTip}
                    </InfoTip>
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="flex-col items-start gap-0"
                    onClick={() =>
                      void loadParetoPortfolio(queryClient).then(
                        (preset) => replaceTargets(() => plan.applyPreset(preset)),
                        (e: unknown) => toast.error(`${PARETO}: ${String(e)}`),
                      )
                    }
                  >
                    {PARETO}
                    <span className="text-muted-foreground text-xs">
                      {m.rebalance.targets.paretoMeta}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        footer={
          <span className={cn("num flex items-center gap-2", off && "text-warning")}>
            {m.rebalance.targets.sum(formatShare(plan.targetSum))}
            <InfoTip label={m.rebalance.targets.sumLabel}>{m.rebalance.targets.sumTip}</InfoTip>
            {off && (
              <>
                {m.rebalance.targets.off(formatPercent(plan.targetSum - 1))}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => replaceTargets(plan.normalizeTargets)}
                >
                  {m.rebalance.targets.scale}
                </Button>
              </>
            )}
          </span>
        }
      >
        {plan.rows.length === 0 ? (
          <p className="text-muted-foreground p-3">{m.rebalance.targets.empty(plan.group?.name)}</p>
        ) : (
          <TargetsTable key={version} rows={plan.rows} />
        )}
      </PlanStep>

      <PlanStep
        step={3}
        title={m.rebalance.orders.title}
        description={m.rebalance.orders.description}
        actions={
          <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-x-4 text-xs">
            <span className="num">
              {m.rebalance.orders.counts(sold.length, orders.length - sold.length)}
            </span>
            <span className="sensitive num">
              {m.common.sell} <span className="text-foreground">{formatInteger(sells)}</span>
            </span>
            <span className="sensitive num">
              {m.common.buy} <span className="text-foreground">{formatInteger(buys)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("sensitive num", cashLeft < 0 && "text-warning")}>
                {m.rebalance.orders.cashLeft(
                  <span key="amount" className={cn(cashLeft >= 0 && "text-foreground")}>
                    {formatInteger(cashLeft)}
                  </span>,
                )}
              </span>
              <InfoTip label={m.rebalance.orders.cashLeftLabel}>
                {m.rebalance.orders.cashLeftTip}
              </InfoTip>
            </span>
          </span>
        }
      >
        <OrdersTable rows={plan.rows} />
        <PlanCheck rows={plan.rows} cashLeft={cashLeft} />
      </PlanStep>
    </>
  );
}
