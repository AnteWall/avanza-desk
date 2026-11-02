import { useRuleState } from "@/components/alerts/use-rule-state";
import { measure, type AlertRule } from "@/lib/alert-rules";

const SHOWN = 4;

/**
 * Where the rule stands right now: the current value per instrument it watches (those that
 * would notify first), so a threshold can be picked against real numbers.
 */
export function RuleNow({ rule }: { rule: AlertRule }) {
  const state = useRuleState([rule]);
  if (!state) return <p className="text-muted-foreground text-xs">Reading current values…</p>;
  const all = measure(rule, state).sort(
    (a, b) => +b.fires - +a.fires || Math.abs(b.value) - Math.abs(a.value),
  );
  if (all.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {rule.kind === "signal"
          ? "No recent signals here. New ones will notify as they appear."
          : rule.kind === "drift"
            ? "No rebalance targets saved yet: set them on the Rebalance page."
            : "Avanza has no current value for this yet."}
      </p>
    );
  const firing = all.filter((m) => m.fires).length;
  return (
    <div className="flex flex-col gap-1 text-xs">
      <ul className="flex flex-col gap-0.5">
        {all.slice(0, SHOWN).map((m) => (
          <li key={m.key} className="flex justify-between gap-3">
            <span className="truncate">{m.name}</span>
            <span className={m.fires ? "num text-warning" : "num text-muted-foreground"}>
              {m.text}
            </span>
          </li>
        ))}
      </ul>
      {all.length > SHOWN && <p className="text-muted-foreground">and {all.length - SHOWN} more</p>}
      {firing > 0 && (
        <p className="text-warning">
          {firing === 1 ? "This holds" : `${firing} of these hold`} already: you'll be notified
          right away.
        </p>
      )}
    </div>
  );
}
