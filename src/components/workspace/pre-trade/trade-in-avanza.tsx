import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Instrument } from "@/lib/avanza/instrument";
import { avanzaOrderUrl } from "@/lib/avanza/links";

/** Hands the order over to Avanza's own order page (avanza-ts can't place orders). */
export function TradeInAvanza({
  instrument,
  side,
}: {
  instrument: Instrument;
  side: "buy" | "sell";
}) {
  const fund = instrument.kind === "fund";
  const url = avanzaOrderUrl(instrument.orderbookId, instrument.name, side, fund);
  return (
    <Button
      onClick={() => void openUrl(url)}
      className={cn(
        "w-full",
        !fund && "text-white",
        !fund && (side === "buy" ? "bg-buy hover:bg-buy/90" : "bg-sell hover:bg-sell/90"),
      )}
    >
      {fund
        ? "Open in Avanza"
        : `${side === "buy" ? "Buy" : "Sell"} ${instrument.shortName} in Avanza`}
      <ExternalLink />
    </Button>
  );
}
