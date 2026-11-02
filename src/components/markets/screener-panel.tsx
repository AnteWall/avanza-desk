import { Filter } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { ScreenerTable } from "@/components/markets/screener-table";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/workspace/panel";
import { useDebounced } from "@/lib/use-debounced";

/** Stock screener: filter by name, sorted by how many Avanza customers own each stock. */
export function ScreenerPanel() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  // Keeps the current rows on screen while the next filter loads, instead of a skeleton.
  const shown = useDeferredValue(debounced);

  return (
    <Panel
      title="Screener"
      icon={Filter}
      subtitle="Most owned on Avanza"
      actions={
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          aria-label="Filter stocks by name"
          className="h-6 w-48 text-xs"
        />
      }
    >
      <AsyncBoundary what="the screener" fallback={<TableSkeleton rows={12} columns={8} />}>
        <ScreenerTable name={shown} />
      </AsyncBoundary>
    </Panel>
  );
}
