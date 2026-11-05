import { useQuery } from "@tanstack/react-query";
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
import { quoteQuery } from "@/lib/avanza/queries";
import { formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { SignalKind } from "@/lib/signals";

const unitHint: Record<string, string> = m.alerts.form.unitHint;

const asInput = (n: number) => String(n).replace(".", ",");

/** "Every holding" / "Every held stock": what a rule without a target covers. */
const allLabel = (kind: RuleKind) =>
  kind === "price"
    ? m.alerts.form.pickStock
    : ruleKinds[kind].scope === "holdings" || kind === "day-move"
      ? m.alerts.form.everyHolding
      : m.alerts.form.everyHeldStock;

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
  const [threshold, setThreshold] = useState(
    initial.threshold > 0 ? asInput(initial.threshold) : "",
  );
  const [direction, setDirection] = useState(initial.direction ?? "above");
  const kind = ruleKinds[initial.kind];
  const isPrice = initial.kind === "price";
  // Price rules pick levels around the live price, so they read it here.
  const { data: quote } = useQuery({
    ...quoteQuery(target?.id ?? ""),
    enabled: isPrice && !!target,
  });
  const last = isPrice ? (quote?.last ?? undefined) : undefined;
  const value = Number(threshold.replace(",", "."));
  const valid =
    threshold.trim() !== "" && Number.isFinite(value) && value > 0 && (!isPrice || !!target);
  const rule: AlertRule = {
    ...initial,
    target,
    signalKind,
    threshold: valid ? value : initial.threshold,
    ...(isPrice ? { direction } : {}),
  };
  const level = (offset: number) => Math.round(last! * (1 + offset / 100) * 100) / 100;
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
            {m.alerts.form.change}
          </Button>
        )}
      </div>

      {kind.scope !== "accounts" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{m.alerts.form.appliesTo}</span>
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
          <span className="text-muted-foreground text-xs">{m.alerts.form.kindOfSignal}</span>
          <Segmented
            label={m.alerts.form.kindOfSignal}
            className="flex-wrap"
            options={[
              { label: m.alerts.form.any, value: "any" },
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

      {isPrice ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">
            {m.alerts.form.priceLevel}
            {last != null && (
              <>
                {` · ${m.alerts.form.now} `}
                <span className="num">{formatPrice(last)}</span>
              </>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <Segmented
              label={m.alerts.form.direction}
              options={[
                { label: m.alerts.form.risesTo, value: "above" },
                { label: m.alerts.form.fallsTo, value: "below" },
              ]}
              value={direction}
              onChange={setDirection}
            />
            <Input
              aria-label={m.alerts.form.priceLevel}
              inputMode="decimal"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              aria-invalid={threshold !== "" && !valid}
              className="num ml-2 h-7 w-24 text-right"
            />
          </div>
          {last != null && (
            <Segmented
              label={m.alerts.form.levelsFromPrice}
              numeric
              options={kind.presets.map((p) => ({
                label: `${p > 0 ? "+" : "−"}${Math.abs(p)} %`,
                value: p,
              }))}
              value={kind.presets.find((p) => valid && value === level(p))}
              onChange={(p) => {
                setThreshold(asInput(level(p)));
                setDirection(p > 0 ? "above" : "below");
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">
            {initial.kind === "signal" ? m.alerts.form.minimumStrength : m.alerts.form.threshold} (
            {unitHint[kind.unit]})
          </span>
          <div className="flex items-center gap-1">
            <Segmented
              label={m.alerts.form.presets}
              numeric
              options={kind.presets.map((p) => ({
                label: kind.unit === "score" ? String(p) : `${p} ${kind.unit}`,
                value: p,
              }))}
              value={valid ? value : undefined}
              onChange={(p) => setThreshold(String(p))}
            />
            <Input
              aria-label={m.alerts.form.threshold}
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
      )}

      <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
        <p className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{m.alerts.form.notifiesWhen}</span>
          <span className="font-medium">{describeRule(rule)}</span>
        </p>
        <RuleNow rule={rule} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!valid}>
          {editing ? m.alerts.form.saveRule : m.alerts.form.createRule}
        </Button>
      </div>
    </form>
  );
}
