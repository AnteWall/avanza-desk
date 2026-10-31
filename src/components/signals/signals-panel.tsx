import { Bell, Radar } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SignalsTable } from "@/components/signals/signals-table";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/panel";
import { openRuleDialog } from "@/lib/rule-dialog";

/** Insider, short-interest, owner and analyst moves in the stocks you hold or watch. */
export function SignalsPanel() {
  const [heldOnly, setHeldOnly] = useState(false);
  return (
    <Panel
      title="Signals"
      icon={Radar}
      subtitle="last 30 days"
      actions={
        <>
          <Segmented
            label="Stocks"
            options={[
              { label: "All", value: "all" },
              { label: "Held", value: "held" },
            ]}
            value={heldOnly ? "held" : "all"}
            onChange={(v) => setHeldOnly(v === "held")}
          />
          <Button
            variant="outline"
            size="xs"
            className="ml-1"
            onClick={() => openRuleDialog({ kind: "signal" })}
          >
            <Bell />
            Alert me
          </Button>
        </>
      }
    >
      <AsyncBoundary what="your stocks" fallback={<TableSkeleton rows={8} columns={4} />}>
        <SignalsTable heldOnly={heldOnly} />
      </AsyncBoundary>
    </Panel>
  );
}
