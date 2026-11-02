import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { RuleForm } from "@/components/alerts/rule-form";
import { RuleKindPicker } from "@/components/alerts/rule-kind-picker";
import { useAlertRules } from "@/components/alerts/use-alert-rules";
import { useOpenTab } from "@/components/common/use-tab";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describeRule, ruleKinds, saveRule, type AlertRule } from "@/lib/alert-rules";
import {
  closeRuleDialog,
  getRuleDraft,
  openRuleDialog,
  subscribeRuleDialog,
} from "@/lib/rule-dialog";
import { stockholmDay } from "@/lib/snapshots";

/**
 * The one place alert rules are made or edited, opened from anywhere via `openRuleDialog`
 * (src/lib/rule-dialog.ts). Without a kind it starts at "what to watch"; with one it goes
 * straight to the details. Mounted once in the app shell.
 */
export function RuleDialog() {
  const draft = useSyncExternalStore(subscribeRuleDialog, getRuleDraft);
  const rules = useAlertRules();
  const openTab = useOpenTab();
  const editing = !!draft?.id && rules.some((r) => r.id === draft.id);

  const save = (rule: AlertRule) => {
    saveRule(rule);
    closeRuleDialog();
    toast(editing ? "Rule saved" : "Alert rule created", {
      description: describeRule(rule),
      action: { label: "All rules", onClick: () => openTab("/alerts", "alerts", "rules") },
    });
  };

  const kind = draft?.kind;
  const rule: AlertRule | undefined = kind && {
    id: draft.id ?? crypto.randomUUID(),
    created: draft.created ?? stockholmDay(),
    kind,
    // A price level has no sensible default: the form offers levels around the live price.
    threshold: draft.threshold ?? (kind === "price" ? 0 : ruleKinds[kind].presets[1]!),
    target: draft.target,
    signalKind: draft.signalKind,
    direction: draft.direction,
  };

  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && closeRuleDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit alert rule" : "New alert rule"}</DialogTitle>
          <DialogDescription>
            {rule
              ? "AvanzaDesk checks this while it runs and sends a desktop notification, at most once a day per instrument."
              : `What should AvanzaDesk watch${draft?.target ? ` for ${draft.target.name}` : ""}?`}
          </DialogDescription>
        </DialogHeader>
        {rule ? (
          <RuleForm
            // A new kind or target from outside starts the form over.
            key={`${rule.id}:${rule.kind}:${rule.target?.id}`}
            initial={rule}
            editing={editing}
            onBack={editing ? undefined : () => openRuleDialog({ ...draft, kind: undefined })}
            onSave={save}
          />
        ) : (
          <>
            <RuleKindPicker onPick={(k) => openRuleDialog({ ...draft, kind: k })} />
            <div className="flex justify-end">
              <Button variant="ghost" onClick={closeRuleDialog}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
