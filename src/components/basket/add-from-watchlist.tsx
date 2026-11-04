import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ListPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { allPositionsQuery, watchlistRowsQuery, watchlistsQuery } from "@/lib/avanza/queries";
import { fromWatchlistRow, type BasketItem } from "@/lib/basket";

/** "From watchlist": add a whole Avanza watchlist to the basket, or only what you don't own. */
export function AddFromWatchlist({ onAdd }: { onAdd: (items: BasketItem[]) => number }) {
  const queryClient = useQueryClient();
  const { data: lists = [] } = useQuery(watchlistsQuery);

  const add = async (list: (typeof lists)[number], notOwned: boolean) => {
    try {
      const [rows, positions] = await Promise.all([
        queryClient.fetchQuery(watchlistRowsQuery(list.watchListId, list.orderbookIds)),
        queryClient.fetchQuery(allPositionsQuery),
      ]);
      const owned = new Set(positions.withOrderbook.map((p) => p.instrument.orderbook?.id));
      const picked = rows.filter((r) => r.buyable && !(notOwned && owned.has(r.id)));
      const n = onAdd(picked.map(fromWatchlistRow));
      toast.success(
        n ? `Added ${n} from ${list.name}` : `Everything from ${list.name} is already in`,
      );
    } catch (e) {
      toast.error(`${list.name}: ${String(e)}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="xs" disabled={lists.length === 0} />}
      >
        <ListPlus />
        From watchlist
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-64">
        {lists.map((list, i) => (
          <DropdownMenuGroup key={list.watchListId}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{list.name}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void add(list, false)}>
              Add all
              <span className="num text-muted-foreground ml-auto">{list.orderbookIds.length}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void add(list, true)}>
              Add the ones you don't own
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
