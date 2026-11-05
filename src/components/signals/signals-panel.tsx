import { Bell, Radar } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SignalsTable } from "@/components/signals/signals-table";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/panel";
import { m } from "@/lib/i18n";
import { openRuleDialog } from "@/lib/rule-dialog";

/** Insider, short-interest, owner and analyst moves in the stocks you hold or watch. */
export function SignalsPanel() {
  const [heldOnly, setHeldOnly] = useState(false);
  return (
    <Panel
      title={m.signals.panel.title}
      icon={Radar}
      subtitle={m.signals.panel.subtitle}
      actions={
        <>
          <Segmented
            label={m.signals.panel.stocks}
            options={[
              { label: m.common.all, value: "all" },
              { label: m.signals.panel.held, value: "held" },
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
            {m.signals.panel.alertMe}
          </Button>
        </>
      }
    >
      <AsyncBoundary
        what={m.signals.panel.yourStocks}
        fallback={<TableSkeleton rows={8} columns={4} />}
      >
        <SignalsTable heldOnly={heldOnly} />
      </AsyncBoundary>
    </Panel>
  );
}
