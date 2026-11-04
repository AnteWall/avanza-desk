import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight, ShoppingBasket, X } from "lucide-react";
import { useState } from "react";

import { AskMenu } from "@/components/ai/ask-menu";
import { AddFromWatchlist } from "@/components/basket/add-from-watchlist";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { instrumentItem } from "@/lib/ai/context";
import { addToBasketItems, setBasket, useBasketItems } from "@/lib/basket";

/**
 * The basket button at the bottom of the nav rail, with its item count. Opens a list of what's
 * in it; "Split the money" goes to the Basket page to turn it into orders.
 */
export function BasketMenu({
  className,
  labelClassName,
  active,
}: {
  className?: string;
  /** Styles the "Basket" name beside the icon (the nav rail fades it when collapsed). */
  labelClassName?: string;
  /** The Basket page is open: the nav rail highlights this button. */
  active?: boolean;
}) {
  const items = useBasketItems();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            aria-label={`Basket, ${items.length} items`}
            title="Basket"
            data-active={active}
            className={cn("mt-auto", className)}
          />
        }
      >
        <ShoppingBasket />
        {items.length > 0 && (
          // On the icon, so it shows with the rail collapsed too.
          <span className="num bg-brand text-background absolute top-0.5 left-5 min-w-4 rounded-full px-1 text-[10px] leading-4 font-semibold">
            {items.length}
          </span>
        )}
        <span className={labelClassName}>Basket</span>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-80 gap-0 p-0">
        <header className="flex items-center gap-2 border-b p-2 pl-3">
          <span className="font-semibold">Basket</span>
          <span className="num text-muted-foreground text-xs">{items.length}</span>
          <span className="ml-auto">
            <AddFromWatchlist onAdd={addToBasketItems} />
          </span>
        </header>
        {items.length === 0 ? (
          <p className="text-muted-foreground p-3">
            Empty. Add what you want to buy from a watchlist, or search on the Basket page.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-auto py-1">
            {items.map((it) => (
              <AskMenu
                key={it.orderbookId}
                item={instrumentItem(it.orderbookId, it.name, it.type, it.isin)}
                trigger={
                  <li className="h-row flex items-center gap-1.5 px-3">
                    <InstrumentLogo isin={it.isin} name={it.name} />
                    <span className="truncate font-medium">{it.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-auto"
                      aria-label={`Remove ${it.name} from the basket`}
                      title="Remove from the basket"
                      onClick={() => setBasket(items.filter((x) => x !== it))}
                    >
                      <X />
                    </Button>
                  </li>
                }
              />
            ))}
          </ul>
        )}
        <footer className="border-t p-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/basket" });
            }}
          >
            {items.length ? "Split the money" : "Open the basket"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
