import { TransactionSide } from "@/lib/avanza/codes";
import { m } from "@/lib/i18n";

/** Buy/sell label in the side's color (buy = up/blue, sell = down/red). */
export function Side({ side }: { side?: string }) {
  if (side === TransactionSide.Buy)
    return <span className="text-up font-medium">{m.common.buy}</span>;
  if (side === TransactionSide.Sell)
    return <span className="text-down font-medium">{m.common.sell}</span>;
  return <span className="text-muted-foreground">{side ?? "–"}</span>;
}
