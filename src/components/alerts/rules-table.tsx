import { Pencil, Plus, Trash2 } from "lucide-react";

import { ruleKindIcon } from "@/components/alerts/rule-kind-icon";
import { RuleSuggestions } from "@/components/alerts/rule-suggestions";
import { useAlertRules } from "@/components/alerts/use-alert-rules";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { describeRule, removeRule, ruleKinds, type AlertRule } from "@/lib/alert-rules";
import { formatDate } from "@/lib/format";
import { m } from "@/lib/i18n";
import { openRuleDialog } from "@/lib/rule-dialog";

const col = dataTableColumns<AlertRule>();
const columns = col.columns([
  col.accessor((r) => ruleKinds[r.kind].label, {
    id: "kind",
    header: m.alerts.rules.rule,
    cell: (c) => {
      const Icon = ruleKindIcon[c.row.original.kind];
      return (
        <span className="flex items-center gap-1.5">
          <Icon className="text-muted-foreground size-3.5" aria-hidden />
          {c.getValue()}
        </span>
      );
    },
  }),
  col.accessor((r) => describeRule(r), {
    id: "when",
    header: m.alerts.rules.notifiesWhen,
    meta: { className: "max-w-0 w-full truncate" },
  }),
  col.accessor("created", {
    header: m.alerts.rules.since,
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.display({
    id: "actions",
    cell: (c) => (
      // Buttons inside a clickable row: keep their clicks from also opening the editor.
      <span className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.alerts.rules.edit}
          onClick={() => openRuleDialog(c.row.original)}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.alerts.rules.delete}
          onClick={() => removeRule(c.row.original.id)}
        >
          <Trash2 />
        </Button>
      </span>
    ),
    meta: { align: "end" },
  }),
]);

/**
 * AvanzaDesk's own alerts, checked on this computer while the app runs (RuleWatcher): things
 * Avanza's price alerts can't watch. Rules are also created from any instrument's right-click
 * menu and from the stats in the workspace; suggestions come from your own numbers.
 */
export function RulesTable() {
  const rules = useAlertRules();
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b p-3">
        <Button size="sm" onClick={() => openRuleDialog()}>
          <Plus />
          {m.alerts.rules.newRule}
        </Button>
        <p className="text-muted-foreground text-xs">{m.alerts.rules.tip}</p>
      </div>
      <RuleSuggestions rules={rules} />
      {rules.length === 0 ? (
        <p className="text-muted-foreground p-3">{m.alerts.rules.empty}</p>
      ) : (
        <DataTable
          columns={columns}
          data={rules}
          getRowId={(r) => r.id}
          onRowClick={(r) => openRuleDialog(r)}
        />
      )}
    </div>
  );
}
