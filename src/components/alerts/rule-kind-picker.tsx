import { ruleKindIcon } from "@/components/alerts/rule-kind-icon";
import { ruleKinds, type RuleKind } from "@/lib/alert-rules";
import { m } from "@/lib/i18n";

const groups: { title: string; kinds: RuleKind[] }[] = [
  {
    title: m.alerts.picker.stocks,
    kinds: ["price", "day-move", "signal", "short", "upside"],
  },
  { title: m.alerts.picker.portfolio, kinds: ["loss", "weight", "drift", "ltv"] },
];

/** Step one of a new rule: what to watch, each kind with a line on what it catches. */
export function RuleKindPicker({ onPick }: { onPick: (kind: RuleKind) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground text-xs">{g.title}</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {g.kinds.map((kind) => {
              const Icon = ruleKindIcon[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onPick(kind)}
                  className="hover:bg-muted/60 focus-visible:ring-ring flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors outline-none focus-visible:ring-2"
                >
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{ruleKinds[kind].label}</span>
                    <span className="text-muted-foreground text-xs">{ruleKinds[kind].explain}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
