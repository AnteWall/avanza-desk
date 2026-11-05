import { useRuleState } from "@/components/alerts/use-rule-state";
import { measure, type AlertRule } from "@/lib/alert-rules";
import { m } from "@/lib/i18n";

const SHOWN = 4;

/**
 * Where the rule stands right now: the current value per instrument it watches (those that
 * would notify first), so a threshold can be picked against real numbers.
 */
export function RuleNow({ rule }: { rule: AlertRule }) {
  const state = useRuleState([rule]);
  if (!state) return <p className="text-muted-foreground text-xs">{m.alerts.now.reading}</p>;
  const all = measure(rule, state).sort(
    (a, b) => +b.fires - +a.fires || Math.abs(b.value) - Math.abs(a.value),
  );
  if (all.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {rule.kind === "signal"
          ? m.alerts.now.noSignals
          : rule.kind === "drift"
            ? m.alerts.now.noTargets
            : m.alerts.now.noValue}
      </p>
    );
  const firing = all.filter((x) => x.fires).length;
  return (
    <div className="flex flex-col gap-1 text-xs">
      <ul className="flex flex-col gap-0.5">
        {all.slice(0, SHOWN).map((x) => (
          <li key={x.key} className="flex justify-between gap-3">
            <span className="truncate">{x.name}</span>
            <span className={x.fires ? "num text-warning" : "num text-muted-foreground"}>
              {x.text}
            </span>
          </li>
        ))}
      </ul>
      {all.length > SHOWN && (
        <p className="text-muted-foreground">{m.alerts.now.more(all.length - SHOWN)}</p>
      )}
      {firing > 0 && <p className="text-warning">{m.alerts.now.holds(firing)}</p>}
    </div>
  );
}
