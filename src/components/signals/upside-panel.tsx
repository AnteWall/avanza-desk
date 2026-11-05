import { Bell, Target } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { UpsideTable } from "@/components/signals/upside-table";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/panel";
import { m } from "@/lib/i18n";
import { openRuleDialog } from "@/lib/rule-dialog";

/** Price against analyst targets and Morningstar fair value, held and watched stocks. */
export function UpsidePanel() {
  return (
    <Panel
      title={m.signals.upside.title}
      icon={Target}
      subtitle={m.signals.upside.subtitle}
      actions={
        <Button variant="outline" size="xs" onClick={() => openRuleDialog({ kind: "upside" })}>
          <Bell />
          {m.signals.panel.alertMe}
        </Button>
      }
    >
      <AsyncBoundary
        what={m.signals.panel.yourStocks}
        fallback={<TableSkeleton rows={8} columns={6} />}
      >
        <UpsideTable />
      </AsyncBoundary>
    </Panel>
  );
}
