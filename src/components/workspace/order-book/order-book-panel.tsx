import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Layers, ListOrdered, Users } from "lucide-react";
import type { ReactNode } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Empty } from "@/components/common/empty";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { BrokersTable } from "@/components/workspace/order-book/brokers-table";
import { LadderTable } from "@/components/workspace/order-book/ladder-table";
import { OrderBookTable } from "@/components/workspace/order-book/order-book-table";
import { TradesTable } from "@/components/workspace/order-book/trades-table";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { useFocusedInstrument } from "@/components/workspace/use-focused-instrument";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";

/** Order depth (as a table or a price ladder with your orders), the trade tape (time & sales) and broker statistics of the focused instrument. */
export function OrderBookPanel() {
  const focus = useFocusedInstrument();
  const { data: instrument } = useQuery({
    ...instrumentQuery(focus?.id ?? "", focus?.type),
    enabled: !!focus,
  });
  const fund = instrument?.kind === "fund" || focus?.type === InstrumentType.Fund;

  const view = (what: string, table: ReactNode) =>
    !focus ? null : fund ? (
      <Empty>Funds trade once a day at NAV, so there is no order book.</Empty>
    ) : (
      <AsyncBoundary what={what} fallback={<TableSkeleton rows={10} />} resetKey={focus.id}>
        {table}
      </AsyncBoundary>
    );

  return (
    <TabbedPanel
      id="order-book"
      aside={instrument?.shortName}
      tabs={[
        {
          value: "depth",
          label: "Depth",
          icon: Layers,
          content: focus && view("the order book", <OrderBookTable focus={focus} />),
        },
        {
          value: "ladder",
          label: "Ladder",
          icon: ListOrdered,
          content: focus && view("the order book", <LadderTable focus={focus} />),
        },
        {
          value: "trades",
          label: "Trades",
          icon: ArrowLeftRight,
          content: focus && view("trades", <TradesTable focus={focus} />),
        },
        {
          value: "brokers",
          label: "Brokers",
          icon: Users,
          content: focus && view("broker statistics", <BrokersTable focus={focus} />),
        },
      ]}
    />
  );
}
