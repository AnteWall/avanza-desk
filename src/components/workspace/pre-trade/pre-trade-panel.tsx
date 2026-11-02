import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Calculator } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Skeleton } from "@/components/common/skeleton";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/workspace/panel";
import { PreTradeEstimate } from "@/components/workspace/pre-trade/pre-trade-estimate";
import { TradeInAvanza } from "@/components/workspace/pre-trade/trade-in-avanza";
import { useFocusedInstrument } from "@/components/workspace/use-focused-instrument";
import { InstrumentType, OrderSide } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";

const estimateSkeleton = (
  <div className="flex flex-col gap-2 py-0.5">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

/**
 * Pre-trade calculator. avanza-ts can't place orders, so the submit button opens the order in
 * Avanza.
 * The inputs stay usable while the estimate loads or fails.
 */
export function PreTradePanel() {
  const focus = useFocusedInstrument();
  const [side, setSide] = useState<OrderSide>(OrderSide.Buy);
  const [quantity, setQuantity] = useState(10);
  const { data: instrument } = useQuery({
    ...instrumentQuery(focus?.id ?? "", focus?.type),
    enabled: !!focus,
  });
  const fund = instrument?.kind === "fund" || focus?.type === InstrumentType.Fund;

  return (
    <Panel
      title="Pre-trade"
      icon={Calculator}
      subtitle={
        instrument && (
          <span className="flex items-center gap-1.5">
            <InstrumentLogo isin={instrument.isin} name={instrument.name} className="size-4" />
            {instrument.shortName}
          </span>
        )
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-md p-0.5">
          {[OrderSide.Buy, OrderSide.Sell].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
              className={cn(
                "h-7 rounded-sm font-medium text-muted-foreground capitalize",
                side === s && s === OrderSide.Buy && "bg-buy text-white",
                side === s && s === OrderSide.Sell && "bg-sell text-white",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {fund ? (
          <>
            <p className="text-muted-foreground">
              Fund orders fill at the next NAV, so there is nothing to estimate.
            </p>
            {instrument && <TradeInAvanza instrument={instrument} side={side} />}
          </>
        ) : (
          <>
            <label className="text-muted-foreground flex flex-col gap-1 text-xs">
              Quantity
              <Input
                type="number"
                min={1}
                className="num h-7 text-right"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, e.currentTarget.valueAsNumber || 0))}
              />
            </label>
            <div className="border-t pt-2">
              {focus && (
                <AsyncBoundary
                  what="the estimate"
                  fallback={estimateSkeleton}
                  compact
                  resetKey={focus.id}
                >
                  <PreTradeEstimate focus={focus} side={side} quantity={quantity} />
                </AsyncBoundary>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Estimate from visible depth, excl. fees.
            </p>
            {instrument && (
              <TradeInAvanza instrument={instrument} side={side} quantity={quantity} />
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
