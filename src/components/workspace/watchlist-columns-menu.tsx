import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWatchlistColumns } from "@/components/workspace/use-watchlist-columns";
import {
  toggleWatchlistColumn,
  watchlistColumnLabels,
  type WatchlistColumn,
} from "@/lib/watchlist-columns";

/** Picks the watchlist's quote columns, turning it into a quote board when widened. */
export function WatchlistColumnsMenu() {
  const shown = useWatchlistColumns();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label="Columns"
            title="Columns"
          />
        }
      >
        <Columns3 />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs">Columns</DropdownMenuLabel>
          {(Object.keys(watchlistColumnLabels) as WatchlistColumn[]).map((c) => (
            <DropdownMenuCheckboxItem
              key={c}
              checked={shown.includes(c)}
              onCheckedChange={() => toggleWatchlistColumn(c)}
            >
              {watchlistColumnLabels[c]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
