import { useQueries, useQuery } from "@tanstack/react-query";
import { ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { IndexConstituents } from "@/components/markets/index-constituents";
import { Panel } from "@/components/workspace/panel";
import { headerIndicesQuery, indexConstituentsQuery } from "@/lib/avanza/queries";

/**
 * Members of the indices in the top bar, as a heatmap (the default: the day at a glance, and
 * no repeat of the gainers list beside it) or a list; pick one in the title bar.
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
  const indexes = all.filter((_, i) => members[i]?.data?.length !== 0);
  const [picked, setPicked] = useState<string>();
  const [view, setView] = useState<"list" | "map">("map");
  // A pick that turns out to have no members falls back to the first that has.
  const active =
    indexes.find((i) => i.link.orderbookId === picked)?.link.orderbookId ??
    indexes[0]?.link.orderbookId;

  return (
    <Panel
      title="Index"
      icon={ChartNoAxesColumn}
      actions={
        indexes.length > 0 && (
          <>
            <Segmented
              label="View"
              options={[
                { label: "Heatmap", value: "map" },
                { label: "List", value: "list" },
              ]}
              value={view}
              onChange={setView}
            />
            <Segmented
              label="Index"
              options={indexes.map((i) => ({
                label: i.link.shortLinkDisplay,
                value: i.link.orderbookId,
              }))}
              value={active}
              onChange={setPicked}
            />
          </>
        )
      }
    >
      {active && (
        <AsyncBoundary
          what="the index"
          fallback={<TableSkeleton rows={10} columns={2} />}
          resetKey={active}
        >
          <IndexConstituents orderbookId={active} view={view} />
        </AsyncBoundary>
      )}
    </Panel>
  );
}
