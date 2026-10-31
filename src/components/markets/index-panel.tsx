import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { IndexConstituents } from "@/components/markets/index-constituents";
import { Panel } from "@/components/workspace/panel";
import { headerIndicesQuery } from "@/lib/avanza/queries";

/** Members of the indices in the top bar; pick one in the title bar. */
export function IndexPanel() {
  // Shares the top bar's ticker cache.
  const { data } = useQuery(headerIndicesQuery);
  const indexes = data?.indexes ?? [];
  const [picked, setPicked] = useState<string>();
  const active = picked ?? indexes[0]?.link.orderbookId;

  return (
    <Panel
      title="Index"
      icon={ChartNoAxesColumn}
      actions={
        indexes.length > 0 && (
          <Segmented
            label="Index"
            options={indexes.map((i) => ({
              label: i.link.shortLinkDisplay,
              value: i.link.orderbookId,
            }))}
            value={active}
            onChange={setPicked}
          />
        )
      }
    >
      {active && (
        <AsyncBoundary
          what="the index"
          fallback={<TableSkeleton rows={10} columns={2} />}
          resetKey={active}
        >
          <IndexConstituents orderbookId={active} />
        </AsyncBoundary>
      )}
    </Panel>
  );
}
