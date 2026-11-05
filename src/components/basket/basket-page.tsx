import { cn } from "cn";
import { Trash2 } from "lucide-react";

import { AddFromWatchlist } from "@/components/basket/add-from-watchlist";
import { BasketTable } from "@/components/basket/basket-table";
import { useBasket } from "@/components/basket/use-basket";
import { InfoTip } from "@/components/common/info-tip";
import { AddInstrument } from "@/components/rebalance/add-instrument";
import { BuyingPowerMenu } from "@/components/rebalance/buying-power-menu";
import { OrdersTable } from "@/components/rebalance/orders-table";
import { PlanStep } from "@/components/rebalance/plan-step";
import { UnitInput } from "@/components/rebalance/unit-input";
import { Button } from "@/components/ui/button";
import { formatDecimal, formatInteger, parseDecimal } from "@/lib/format";
import { m } from "@/lib/i18n";

/**
 * The Basket page: collect what you want to buy, then split an amount over it. Unlike Rebalance
 * it ignores your holdings: the money goes only to what's in the basket.
 */
export function BasketPage() {
  const basket = useBasket();
  const buys = basket.rows.reduce((s, r) => s + (r.order?.amount ?? 0), 0);
  const skipped = basket.money
    ? basket.rows.filter((r) => !r.order && r.item.weight > 0).length
    : 0;

  return (
    <div className="bg-background h-full min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{m.basket.title}</h1>
          <p className="text-muted-foreground">{m.basket.intro}</p>
        </header>

        <PlanStep
          step={1}
          title={m.basket.pick.title}
          description={m.basket.pick.description}
          actions={
            <>
              <AddInstrument inPlan={basket.ids} onAdd={(a) => basket.add([{ ...a, weight: 1 }])} />
              <AddFromWatchlist onAdd={basket.add} />
              {basket.rows.length > 0 && (
                <Button variant="ghost" size="xs" onClick={basket.clear}>
                  <Trash2 />
                  {m.basket.pick.empty}
                </Button>
              )}
            </>
          }
        >
          {basket.rows.length === 0 ? (
            <p className="text-muted-foreground p-3">{m.basket.pick.isEmpty}</p>
          ) : (
            <BasketTable rows={basket.rows} />
          )}
        </PlanStep>

        <PlanStep
          step={2}
          title={m.basket.split.title}
          description={m.basket.split.description}
          actions={
            <>
              <span className="text-muted-foreground text-xs">{m.rebalance.setup.minOrder}</span>
              <UnitInput
                unit="SEK"
                aria-label={m.rebalance.setup.minOrderAria}
                title={m.basket.split.minOrderTip}
                inputMode="numeric"
                className="w-24"
                defaultValue={formatDecimal(basket.minOrder)}
                onChange={(e) => {
                  const v = parseDecimal(e.currentTarget.value);
                  if (Number.isFinite(v)) basket.setMinOrder(Math.max(v, 0));
                }}
              />
              <span className="text-muted-foreground ml-2 text-xs">{m.basket.split.toSpend}</span>
              <UnitInput
                unit="SEK"
                aria-label={m.basket.split.toSpendAria}
                type="number"
                min={0}
                step={1000}
                className={cn("w-36", basket.money > 0 && "sensitive")}
                value={basket.money || ""}
                placeholder="0"
                onChange={(e) => basket.setMoney(Math.max(0, e.currentTarget.valueAsNumber || 0))}
              />
              <BuyingPowerMenu onPick={basket.setMoney} />
            </>
          }
          footer={
            basket.money > 0 && (
              <>
                <span className="sensitive num">
                  {m.basket.split.buy(
                    <span key="amount" className="text-foreground">
                      {formatInteger(buys)}
                    </span>,
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="sensitive num">
                    {m.basket.split.left(
                      <span key="amount" className="text-foreground">
                        {formatInteger(basket.money - buys)}
                      </span>,
                    )}
                  </span>
                  <InfoTip label={m.basket.split.leftLabel}>{m.basket.split.leftTip}</InfoTip>
                </span>
                {skipped > 0 && (
                  <span className="text-warning">
                    {m.basket.split.skipped(skipped, formatInteger(basket.minOrder))}
                  </span>
                )}
              </>
            )
          }
        >
          <OrdersTable
            rows={basket.rows}
            empty={basket.money ? m.basket.split.tooSmall : m.basket.split.enterAmount}
          />
        </PlanStep>
      </div>
    </div>
  );
}
