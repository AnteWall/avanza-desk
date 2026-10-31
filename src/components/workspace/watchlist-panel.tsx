import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel } from "@/components/workspace/panel";
import { WatchlistTable } from "@/components/workspace/watchlist-table";
import { watchlistsQuery } from "@/lib/avanza/queries";
import { getSetting, saveSetting } from "@/lib/settings";

const SETTING = "watchlist";

export function WatchlistPanel() {
  // The picker only decorates the header; the table owns loading and errors.
  const { data: watchlists = [] } = useQuery(watchlistsQuery);
  const [selectedId, setSelectedId] = useState(() => getSetting<string | null>(SETTING, null));
  const watchlist = watchlists.find((w) => w.watchListId === selectedId) ?? watchlists[0];

  return (
    <Panel
      title="Watchlist"
      icon={Star}
      subtitle={watchlists.length === 1 ? watchlist?.name : undefined}
      actions={
        watchlists.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="xs" className="text-muted-foreground" />}
            >
              {watchlist?.name}
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={watchlist?.watchListId}
                onValueChange={(id: string) => {
                  setSelectedId(id);
                  void saveSetting(SETTING, id);
                }}
              >
                {watchlists.map((w) => (
                  <DropdownMenuRadioItem key={w.watchListId} value={w.watchListId}>
                    {w.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    >
      <AsyncBoundary what="the watchlist" fallback={<TableSkeleton />} resetKey={selectedId ?? ""}>
        <WatchlistTable watchListId={selectedId} />
      </AsyncBoundary>
    </Panel>
  );
}
