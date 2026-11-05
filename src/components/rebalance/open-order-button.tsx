import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";

import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { Button } from "@/components/ui/button";
import { InstrumentType } from "@/lib/avanza/codes";
import { avanzaOrderUrl } from "@/lib/avanza/links";
import { m } from "@/lib/i18n";

/** Opens the row's order in Avanza: funds on their buy/sell page, others with shares filled in. */
export function OpenOrderButton({ row }: { row: RebalanceRow }) {
  const { order, orderbookId } = row;
  if (!order) return null;
  // Unlisted holdings (no orderbook) can't be ordered through Avanza's pages.
  if (!orderbookId)
    return <span className="text-muted-foreground text-xs">{m.rebalance.orders.notTradable}</span>;
  const url = avanzaOrderUrl(
    orderbookId,
    row.name,
    order.side,
    row.type === InstrumentType.Fund,
    order.shares == null ? undefined : Math.abs(order.shares),
  );
  return (
    <Button variant="outline" size="xs" onClick={() => void openUrl(url)}>
      {m.rebalance.orders.open}
      <ExternalLink data-icon="inline-end" />
    </Button>
  );
}
