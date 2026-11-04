import { useQueries, useQuery } from "@tanstack/react-query";
import { ChartNoAxesColumn, ChevronDown } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { IndexConstituents } from "@/components/markets/index-constituents";
import { WorldMap } from "@/components/markets/world-map";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel } from "@/components/workspace/panel";
import { headerIndicesQuery, indexConstituentsQuery } from "@/lib/avanza/queries";

type IndexOption = { id: string; label: string; region: string };

// Indices Avanza lists members for beyond the top bar's (found with its index search, Nov 2026).
const MORE_INDICES: IndexOption[] = [
  { id: "19002", label: "OMXS30", region: "Nordic" },
  { id: "53548", label: "OMX Nordic 40", region: "Nordic" },
  { id: "53291", label: "OMXC20", region: "Nordic" },
  { id: "731293", label: "OMXC25", region: "Nordic" },
  { id: "53295", label: "OMXH25", region: "Nordic" },
  { id: "18981", label: "DAX", region: "Europe" },
  { id: "155541", label: "Nasdaq 100", region: "US" },
  { id: "18985", label: "Dow Jones", region: "US" },
];

/**
 * Members of the indices in the top bar and the other indices Avanza lists members for, as a heatmap (the default: the day at a glance, and
 * no repeat of the gainers list beside it), a list, or every index Avanza tracks on a world map with
 * each exchange's open status; pick one in the title bar.
 */
export function IndexPanel() {
  // Shares the top bar's ticker cache.
  const { data } = useQuery(headerIndicesQuery);
  const all = data?.indexes ?? [];
  // Avanza lists members for some indices only (not e.g. DJUS): offer those that have them.
  // One read each, no polling here; the shown index's own query refreshes.
  const members = useQueries({
    queries: all.map((i) => ({
      ...indexConstituentsQuery(i.link.orderbookId),
      refetchInterval: false as const,
    })),
  });
  // Your top bar's indices first, then the rest.
  const indexes: IndexOption[] = all
    .filter((_, i) => members[i]?.data?.length !== 0)
    .map((i) => ({ id: i.link.orderbookId, label: i.link.shortLinkDisplay, region: "Top bar" }));
  for (const more of MORE_INDICES) if (!indexes.some((i) => i.id === more.id)) indexes.push(more);
  const regions = [...new Set(indexes.map((i) => i.region))];
  const [picked, setPicked] = useState<string>();
  const [view, setView] = useState<"list" | "map" | "world">("map");
  // A pick that turns out to have no members falls back to the first that has.
  const active = indexes.find((i) => i.id === picked) ?? indexes[0];

  return (
    <Panel
      title="Index"
      icon={ChartNoAxesColumn}
      actions={
        <>
          <Segmented
            label="View"
            options={[
              { label: "Heatmap", value: "map" },
              { label: "List", value: "list" },
              { label: "World", value: "world" },
            ]}
            value={view}
            onChange={setView}
          />
          {view !== "world" && active && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="xs" aria-label="Index" />}
              >
                {active.label}
                <ChevronDown data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup value={active.id} onValueChange={setPicked}>
                  {regions.map((region) => (
                    <DropdownMenuGroup key={region}>
                      <DropdownMenuLabel>{region}</DropdownMenuLabel>
                      {indexes
                        .filter((i) => i.region === region)
                        .map((i) => (
                          <DropdownMenuRadioItem key={i.id} value={i.id}>
                            {i.label}
                          </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      }
    >
      {view === "world" ? (
        <AsyncBoundary what="world indices" fallback={<TableSkeleton rows={10} columns={3} />}>
          <WorldMap />
        </AsyncBoundary>
      ) : (
        active && (
          <AsyncBoundary
            what="the index"
            fallback={<TableSkeleton rows={10} columns={2} />}
            resetKey={active.id}
          >
            <IndexConstituents orderbookId={active.id} view={view} />
          </AsyncBoundary>
        )
      )}
    </Panel>
  );
}
