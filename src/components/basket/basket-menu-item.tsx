import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { ContextMenuItem } from "@/components/ui/context-menu";
import type { ContextItem } from "@/lib/ai/context";
import { addToBasket, setBasket, useBasketItems } from "@/lib/basket";

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
              () => toast.success(`Added ${item.name} to the basket`),
              (e: unknown) =>
                toast.error(`Couldn't add ${item.name}, try again`, { description: String(e) }),
            )
      }
    >
      <ShoppingBasket />
      <span className="truncate">{inBasket ? "Remove from basket" : "Add to basket"}</span>
    </ContextMenuItem>
  );
}
