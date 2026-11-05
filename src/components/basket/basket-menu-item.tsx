import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { ContextMenuItem } from "@/components/ui/context-menu";
import type { ContextItem } from "@/lib/ai/context";
import { addToBasket, setBasket, useBasketItems } from "@/lib/basket";
import { m } from "@/lib/i18n";

/** "Add to basket" (or "Remove from basket") in an instrument's right-click menu. */
export function BasketMenuItem({ item }: { item: Extract<ContextItem, { kind: "instrument" }> }) {
  const queryClient = useQueryClient();
  const items = useBasketItems();
  const inBasket = items.some((it) => it.orderbookId === item.id);
  return (
    <ContextMenuItem
      onClick={() =>
        inBasket
          ? setBasket(items.filter((it) => it.orderbookId !== item.id))
          : void addToBasket(queryClient, item).then(
              () => toast.success(m.basket.contextMenu.added(item.name)),
              (e: unknown) =>
                toast.error(m.basket.contextMenu.failed(item.name), { description: String(e) }),
            )
      }
    >
      <ShoppingBasket />
      <span className="truncate">
        {inBasket ? m.basket.contextMenu.remove : m.basket.contextMenu.add}
      </span>
    </ContextMenuItem>
  );
}
