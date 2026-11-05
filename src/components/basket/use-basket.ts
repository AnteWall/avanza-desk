import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { useBuyPrices } from "@/components/rebalance/use-rebalance-plan";
import { allPositionsQuery } from "@/lib/avanza/queries";
import {
  addToBasketItems,
  basketOrders,
  setBasket,
  useBasketItems,
  type BasketItem,
} from "@/lib/basket";
import { m } from "@/lib/i18n";
import { defaultOptions } from "@/lib/rebalance";
import { getSetting, saveSetting } from "@/lib/settings";

// Its own setting: a basket of small buys may want a lower minimum than rebalancing.
const minOrderKey = "basket:minOrder";

/** A basket row: the item, whether you own it already, and its order (as a rebalance row). */
export type BasketRow = RebalanceRow & {
  item: BasketItem;
  owned: boolean;
  setWeight: (weight: number) => void;
};

/**
 * The basket: instruments you want to buy, saved apart from rebalance, and the buys that split
 * `money` over them by weight. Your holdings don't count; owned items are only marked.
 */
export function useBasket() {
  const items = useBasketItems();
  const [money, setMoney] = useState(0);
  const [minOrder, setMinOrderState] = useState(() =>
    getSetting(minOrderKey, defaultOptions.minOrder),
  );
  const prices = useBuyPrices(items);
  const { data: positions } = useQuery(allPositionsQuery);
  const owned = new Set(positions?.withOrderbook.flatMap((p) => p.instrument.orderbook?.id ?? []));

  const ids = new Set(items.map((it) => it.orderbookId));
  const sum = items.reduce((s, it) => s + it.weight, 0);
  const orders = basketOrders(items, prices, money, minOrder);
  const rows: BasketRow[] = items.map((it, i) => {
    const setWeight = (weight: number) =>
      setBasket(items.map((x) => (x === it ? { ...x, weight } : x)));
    return {
      ...it,
      item: it,
      key: it.orderbookId,
      owned: owned.has(it.orderbookId),
      value: 0,
      accounts: [],
      weight: 0,
      target: sum ? it.weight / sum : 0,
      order: orders[i]!,
      setWeight,
      // Rebalance's row shape; the basket's target is the weight's share.
      setTarget: (share) => setWeight(share * sum),
      remove: () => setBasket(items.filter((x) => x !== it)),
    };
  });

  return {
    rows,
    ids,
    money,
    setMoney,
    minOrder,
    setMinOrder: (sek: number) => {
      setMinOrderState(sek);
      void saveSetting(minOrderKey, sek);
    },
    add: addToBasketItems,
    clear: () => {
      setBasket([]);
      toast(m.basket.emptied, {
        action: { label: m.basket.undo, onClick: () => setBasket(items) },
      });
    },
  };
}
