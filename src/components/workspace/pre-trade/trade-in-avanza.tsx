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
  quantity,
}: {
  instrument: Instrument;
  side: "buy" | "sell";
  quantity?: number;
}) {
  const url = avanzaOrderUrl(
    instrument.orderbookId,
    instrument.name,
    side,
    instrument.kind === "fund",
    quantity,
  );
  return (
    <Button
      onClick={() => void openUrl(url)}
      className={cn(
        "w-full text-white",
        side === "buy" ? "bg-buy hover:bg-buy/90" : "bg-sell hover:bg-sell/90",
      )}
    >
      {`${side === "buy" ? "Buy" : "Sell"} ${instrument.shortName} in Avanza`}
      <ExternalLink />
    </Button>
  );
}
