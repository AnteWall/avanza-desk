import { Bell, Target } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { UpsideTable } from "@/components/signals/upside-table";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/panel";
import { openRuleDialog } from "@/lib/rule-dialog";

/** Price against analyst targets and Morningstar fair value, held and watched stocks. */
export function UpsidePanel() {
  return (
    <Panel
      title="Upside"
      icon={Target}
      subtitle="vs analyst target and fair value"
      actions={
        <Button variant="outline" size="xs" onClick={() => openRuleDialog({ kind: "upside" })}>
          <Bell />
          Alert me
        </Button>
      }
    >
      <AsyncBoundary what="your stocks" fallback={<TableSkeleton rows={8} columns={6} />}>
        <UpsideTable />
      </AsyncBoundary>
    </Panel>
  );
}
