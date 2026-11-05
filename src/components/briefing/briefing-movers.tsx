import { Change } from "@/components/common/change";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import type { Mover } from "@/lib/briefing";
import { m } from "@/lib/i18n";

/** Gainers and fallers side by side; each bar is the move against the biggest one. */
export function BriefingMovers({ movers }: { movers: readonly Mover[] }) {
  const focus = useFocusInstrument();
  const max = Math.max(...movers.map((x) => Math.abs(x.ratio)));
  const columns = [
    { label: m.briefing.movers.gained, rows: movers.filter((x) => x.ratio > 0) },
    { label: m.briefing.movers.fell, rows: movers.filter((x) => x.ratio < 0) },
  ].filter((c) => c.rows.length > 0);

  return (
    <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
      {columns.map((c) => (
        <div key={c.label} className="flex flex-col">
          <h3 className="text-muted-foreground mb-1 text-xs font-medium">{c.label}</h3>
          {c.rows.map((x) => (
            <button
              key={x.key}
              type="button"
              disabled={!x.orderbookId}
              onClick={() => x.orderbookId && focus(x.orderbookId, x.type)}
              title={m.briefing.openInWorkspace}
              className="enabled:hover:bg-muted/60 focus-visible:bg-muted -mx-2 flex h-10 items-center gap-3 rounded-md px-2 text-left transition-colors outline-none enabled:cursor-pointer"
            >
              <InstrumentLogo isin={x.isin} name={x.name} className="size-6" />
              <span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
              <span className="bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
                <span
                  className={`block h-full rounded-full ${x.ratio > 0 ? "bg-up" : "bg-down"}`}
                  style={{ width: `${(Math.abs(x.ratio) / max) * 100}%` }}
                />
              </span>
              <Change ratio={x.ratio} className="w-16 shrink-0 text-right" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
