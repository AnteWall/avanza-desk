import { TransactionSide } from "@/lib/avanza/codes";

/** Buy/sell label in the side's color (buy = up/blue, sell = down/red). */
export function Side({ side }: { side?: string }) {
  if (side === TransactionSide.Buy) return <span className="text-up font-medium">Buy</span>;
  if (side === TransactionSide.Sell) return <span className="text-down font-medium">Sell</span>;
  return <span className="text-muted-foreground">{side ?? "–"}</span>;
}
