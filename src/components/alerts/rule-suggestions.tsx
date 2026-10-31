import { Lightbulb } from "lucide-react";

import { ruleKindIcon } from "@/components/alerts/rule-kind-icon";
import { useRuleState } from "@/components/alerts/use-rule-state";
import { Button } from "@/components/ui/button";
import { describeRule, saveRule, suggestRules, type AlertRule } from "@/lib/alert-rules";
import { openRuleDialog } from "@/lib/rule-dialog";
import { stockholmDay } from "@/lib/snapshots";

// Pseudo-rules that make useRuleState read what suggestions are built from: holdings, credit
// and held stocks' short interest.
const sources: Pick<AlertRule, "kind">[] = [{ kind: "weight" }, { kind: "ltv" }, { kind: "short" }];

/** Rules worth adding, from your own numbers; each adds in one click or opens to adjust. */
export function RuleSuggestions({ rules }: { rules: readonly AlertRule[] }) {
  const state = useRuleState(sources);
  const suggestions = state ? suggestRules(state, rules) : [];
  if (suggestions.length === 0) return null;
  return (
    <section className="flex flex-col gap-1 border-b p-3">
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Lightbulb className="size-3.5" aria-hidden />
        Suggested from your portfolio
      </h3>
      <ul className="flex flex-col">
        {suggestions.map((s) => {
          const Icon = ruleKindIcon[s.kind];
          return (
            <li key={`${s.kind}:${s.target?.id}`} className="flex h-8 items-center gap-2">
              <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{describeRule(s)}</span>
              <Button variant="ghost" size="xs" onClick={() => openRuleDialog(s)}>
                Adjust…
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => saveRule({ ...s, id: crypto.randomUUID(), created: stockholmDay() })}
              >
                Add
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
