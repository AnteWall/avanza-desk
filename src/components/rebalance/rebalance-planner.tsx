import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Bell, ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InfoTip } from "@/components/common/info-tip";
import { Segmented } from "@/components/common/segmented";
import { GroupPicker } from "@/components/portfolio/holdings/group-picker";
import { AddInstrument } from "@/components/rebalance/add-instrument";
import { OrdersTable } from "@/components/rebalance/orders-table";
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
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatShare,
  parseDecimal,
} from "@/lib/format";
import { loadParetoPortfolio } from "@/lib/pareto";
import { openRuleDialog } from "@/lib/rule-dialog";

const modes = [
  { label: "Buy and sell", value: "full" },
  { label: "Buy only", value: "buy" },
] as const;

/**
 * Plan a rebalance in three steps: what to rebalance and with how much new money, the target
 * share of each instrument (add ones you don't own yet), then the orders that get there. With a
 * group picked it rebalances within the group. Remount it when the group changes.
 */
export function RebalancePlanner() {
  const plan = useRebalancePlan();
  const queryClient = useQueryClient();
  // Target inputs are uncontrolled; changing every target at once remounts the table.
  const [version, setVersion] = useState(0);
  const replaceTargets = (apply: () => void) => {
    apply();
    setVersion((n) => n + 1);
  };

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
          <h1 className="text-lg font-semibold">Rebalance</h1>
          <p className="text-muted-foreground">
            Choose how much of your portfolio each instrument should be. AvanzaDesk works out the
            orders; you place them in Avanza.
          </p>
        </div>
        {!plan.group && (
          <Button
            variant="outline"
            size="xs"
            className="ml-auto shrink-0"
            onClick={() => openRuleDialog({ kind: "drift" })}
          >
            <Bell />
            Alert on drift
          </Button>
        )}
      </header>

      <PlanStep
        step={1}
        title="What to rebalance"
        description="Which holdings, how much new money, and how closely to follow the targets."
      >
        <div className="grid grid-cols-5 gap-4 p-3">
          <PlanField
            label="Holdings"
            tip="Rebalance everything, or only one of your groups (make groups by right-clicking rows below or on the Portfolio page). Each group keeps its own targets."
          >
            <GroupPicker />
          </PlanField>
          <PlanField
            label="New money"
            tip="Cash you're adding, such as this month's savings. It's counted into the total before targets are applied and spent on what is below target. Leave it empty to rebalance what you already have."
          >
            <UnitInput
              unit="SEK"
              aria-label="New money, SEK"
              type="number"
              min={0}
              step={1000}
              className={cn(plan.newMoney > 0 && "sensitive")}
              value={plan.newMoney || ""}
              placeholder="0"
              onChange={(e) => plan.setNewMoney(Math.max(0, e.currentTarget.valueAsNumber || 0))}
            />
          </PlanField>
          <PlanField
            label="Mode"
            tip={
              <>
                <p>
                  <span className="font-medium">Buy and sell</span> sells what is above its target
                  to pay for what is below.
                </p>
                <p>
                  <span className="font-medium">Buy only</span> never sells: only the new money is
                  invested, split by how far below target each instrument is. Avoids tax and
                  courtage on sales.
                </p>
              </>
            }
          >
            <Segmented
              label="Mode"
              className="h-7 self-start"
              options={modes}
              value={plan.buyOnly ? "buy" : "full"}
              onChange={(m) => plan.setBuyOnly(m === "buy")}
            />
          </PlanField>
          <PlanField
            label="Tolerance"
            tip="How far an instrument may drift from its target, in either direction, before it gets an order. With 2 and a 10 % target, anything from 8 % to 12 % is left alone. 0 trades every drift."
          >
            <UnitInput
              unit="%"
              aria-label="Tolerance, percent"
              inputMode="decimal"
              defaultValue={formatDecimal(plan.band * 100)}
              onChange={(e) => {
                const v = parseDecimal(e.currentTarget.value);
                if (Number.isFinite(v))
                  plan.setOption({ band: Math.min(Math.max(v, 0), 50) / 100 });
              }}
            />
          </PlanField>
          <PlanField
            label="Minimum order"
            tip="Orders smaller than this are skipped: they cost more in courtage than they fix. 0 keeps every order."
          >
            <UnitInput
              unit="SEK"
              aria-label="Minimum order, SEK"
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
        title="Set your targets"
        description="Targets start at today's weights. Add instruments you want to buy into."
        actions={
          <>
            <AddInstrument inPlan={plan.inPlan} onAdd={plan.add} />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
                <RotateCcw />
                Set targets
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Reset</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => replaceTargets(() => plan.setTargets({}))}>
                    To current weights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => replaceTargets(plan.equalTargets)}>
                    To equal weights
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1">
                    Model portfolios
                    <InfoTip label="model portfolios">
                      Copy a portfolio picked by analysts: its stocks get equal targets, everything
                      else goes to 0 %. Pick a group first so the rest of your holdings stay put.
                    </InfoTip>
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="flex-col items-start gap-0"
                    onClick={() =>
                      void loadParetoPortfolio(queryClient).then(
                        (preset) => replaceTargets(() => plan.applyPreset(preset)),
                        (e: unknown) => toast.error(`Pareto månadsportfölj: ${String(e)}`),
                      )
                    }
                  >
                    Pareto månadsportfölj
                    <span className="text-muted-foreground text-xs">10 stocks · monthly</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        footer={
          <span className={cn("num flex items-center gap-2", off && "text-warning")}>
            Targets add up to {formatShare(plan.targetSum)}
            <InfoTip label="the target total">
              The targets should add up to 100 %. Above that there isn't money for every buy, so all
              buys shrink by the same share; below it, the rest stays as cash. Scale to 100 % keeps
              their proportions.
            </InfoTip>
            {off && (
              <>
                {` (${formatPercent(plan.targetSum - 1)} off)`}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => replaceTargets(plan.normalizeTargets)}
                >
                  Scale to 100 %
                </Button>
              </>
            )}
          </span>
        }
      >
        {plan.rows.length === 0 ? (
          <p className="text-muted-foreground p-3">
            {`No holdings${plan.group ? ` in ${plan.group.name}` : ""} yet. Add an instrument and new money to plan a buy.`}
          </p>
        ) : (
          <TargetsTable key={version} rows={plan.rows} />
        )}
      </PlanStep>

      <PlanStep
        step={3}
        title="Place the orders"
        description="Sell first to free the cash, then buy. Each order opens in Avanza with the amount filled in."
        actions={
          <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-x-4 text-xs">
            <span className="num">
              {sold.length} sells · {orders.length - sold.length} buys
            </span>
            <span className="sensitive num">
              Sell <span className="text-foreground">{formatInteger(sells)}</span>
            </span>
            <span className="sensitive num">
              Buy <span className="text-foreground">{formatInteger(buys)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("sensitive num", cashLeft < 0 && "text-warning")}>
                Cash left{" "}
                <span className={cn(cashLeft >= 0 && "text-foreground")}>
                  {formatInteger(cashLeft)}
                </span>{" "}
                SEK
              </span>
              <InfoTip label="cash left">
                New money plus what the sells bring in, minus what the buys cost. What's left comes
                from rounding to whole shares, the tolerance and the minimum order.
              </InfoTip>
            </span>
          </span>
        }
      >
        <OrdersTable rows={plan.rows} />
      </PlanStep>
    </>
  );
}
