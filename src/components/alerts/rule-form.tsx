import { useState } from "react";

import { ruleKindIcon } from "@/components/alerts/rule-kind-icon";
import { RuleNow } from "@/components/alerts/rule-now";
import { RuleTargetPicker } from "@/components/alerts/rule-target-picker";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  describeRule,
  ruleKinds,
  signalKindLabels,
  type AlertRule,
  type RuleKind,
  type RuleTarget,
} from "@/lib/alert-rules";
import type { SignalKind } from "@/lib/signals";

const unitHint: Record<string, string> = {
  "%": "percent",
  pp: "percentage points",
  score: "1 = just notable, 5 = very strong",
};

/** "Every holding" / "Every held stock": what a rule without a target covers. */
const allLabel = (kind: RuleKind) =>
  ruleKinds[kind].scope === "holdings" || kind === "day-move"
    ? "Every holding"
    : "Every held stock";

/**
 * Step two of a rule: what it applies to, the threshold (presets or typed), and for signal
 * rules which kind of signal. A plain sentence and the current values update as you go.
 */
export function RuleForm({
  initial,
  editing,
  onBack,
  onSave,
}: {
  initial: AlertRule;
  editing: boolean;
  onBack?: () => void;
  onSave: (rule: AlertRule) => void;
}) {
  const [target, setTarget] = useState<RuleTarget | undefined>(initial.target);
  const [signalKind, setSignalKind] = useState<SignalKind | undefined>(initial.signalKind);
  const [threshold, setThreshold] = useState(String(initial.threshold).replace(".", ","));
  const kind = ruleKinds[initial.kind];
  const value = Number(threshold.replace(",", "."));
  const valid = threshold.trim() !== "" && Number.isFinite(value) && value > 0;
  const rule: AlertRule = {
    ...initial,
    target,
    signalKind,
    threshold: valid ? value : initial.threshold,
  };
  const Icon = ruleKindIcon[initial.kind];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(rule);
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4" aria-hidden />
        <span className="font-medium">{kind.label}</span>
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground ml-auto"
            onClick={onBack}
          >
            Change
          </Button>
        )}
      </div>

      {kind.scope !== "accounts" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Applies to</span>
          <RuleTargetPicker
            scope={kind.scope}
            allLabel={allLabel(initial.kind)}
            value={target}
            onChange={setTarget}
          />
        </label>
      )}

      {initial.kind === "signal" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Kind of signal</span>
          <Segmented
            label="Kind of signal"
            className="flex-wrap"
            options={[
              { label: "Any", value: "any" },
              ...(Object.keys(signalKindLabels) as SignalKind[]).map((k) => ({
                label: signalKindLabels[k],
                value: k,
              })),
            ]}
            value={signalKind ?? "any"}
            onChange={(k) => setSignalKind(k === "any" ? undefined : (k as SignalKind))}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">
          {initial.kind === "signal" ? "Minimum strength" : "Threshold"} ({unitHint[kind.unit]})
        </span>
        <div className="flex items-center gap-1">
          <Segmented
            label="Presets"
            numeric
            options={kind.presets.map((p) => ({
              label: kind.unit === "score" ? String(p) : `${p} ${kind.unit}`,
              value: p,
            }))}
            value={valid ? value : undefined}
            onChange={(p) => setThreshold(String(p))}
          />
          <Input
            aria-label="Threshold"
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            aria-invalid={!valid}
            className="num ml-2 h-7 w-20 text-right"
          />
          {kind.unit !== "score" && (
            <span className="text-muted-foreground text-xs">{kind.unit}</span>
          )}
        </div>
      </div>

      <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
        <p className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Notifies when</span>
          <span className="font-medium">{describeRule(rule)}</span>
        </p>
        <RuleNow rule={rule} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!valid}>
          {editing ? "Save rule" : "Create rule"}
        </Button>
      </div>
    </form>
  );
}
