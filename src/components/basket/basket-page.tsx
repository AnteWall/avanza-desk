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
          <h1 className="text-lg font-semibold">Basket</h1>
          <p className="text-muted-foreground">
            Collect what you want to buy. When you have money, AvanzaDesk splits it over the basket;
            you place the orders in Avanza. What you already hold doesn't count.
          </p>
        </header>

        <PlanStep
          step={1}
          title="What you want to buy"
          description="Search for instruments or take them from a watchlist. Weights decide who gets more."
          actions={
            <>
              <AddInstrument inPlan={basket.ids} onAdd={(a) => basket.add([{ ...a, weight: 1 }])} />
              <AddFromWatchlist onAdd={basket.add} />
              {basket.rows.length > 0 && (
                <Button variant="ghost" size="xs" onClick={basket.clear}>
                  <Trash2 />
                  Empty
                </Button>
              )}
            </>
          }
        >
          {basket.rows.length === 0 ? (
            <p className="text-muted-foreground p-3">The basket is empty.</p>
          ) : (
            <BasketTable rows={basket.rows} />
          )}
        </PlanStep>

        <PlanStep
          step={2}
          title="Split the money"
          description="Each order opens in Avanza with the shares filled in."
          actions={
            <>
              <span className="text-muted-foreground text-xs">Minimum order</span>
              <UnitInput
                unit="SEK"
                aria-label="Minimum order, SEK"
                title="Buys smaller than this are skipped: they cost more in courtage than they're worth. 0 keeps every buy."
                inputMode="numeric"
                className="w-24"
                defaultValue={formatDecimal(basket.minOrder)}
                onChange={(e) => {
                  const v = parseDecimal(e.currentTarget.value);
                  if (Number.isFinite(v)) basket.setMinOrder(Math.max(v, 0));
                }}
              />
              <span className="text-muted-foreground ml-2 text-xs">To spend</span>
              <UnitInput
                unit="SEK"
                aria-label="Money to spend, SEK"
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
                  Buy <span className="text-foreground">{formatInteger(buys)}</span> SEK
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="sensitive num">
                    Left{" "}
                    <span className="text-foreground">{formatInteger(basket.money - buys)}</span>{" "}
                    SEK
                  </span>
                  <InfoTip label="money left">
                    What rounding to whole shares and the minimum order leave over.
                  </InfoTip>
                </span>
                {skipped > 0 && (
                  <span className="text-warning">
                    {`${skipped} skipped: their share is below the minimum order (${formatInteger(basket.minOrder)} SEK) or one share`}
                  </span>
                )}
              </>
            )
          }
        >
          <OrdersTable
            rows={basket.rows}
            empty={
              basket.money ? "No orders: the amount is too small." : "Enter how much to spend."
            }
          />
        </PlanStep>
      </div>
    </div>
  );
}
