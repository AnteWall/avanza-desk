import { History } from "lucide-react";

/** A tiny briefing drawn in tokens: a value line, then moves up and down since a clock. */
function BriefingIllustration() {
  const rows = [
    { width: "w-20", move: "bg-up", size: "w-8" },
    { width: "w-24", move: "bg-up", size: "w-5" },
    { width: "w-16", move: "bg-down", size: "w-6" },
  ];
  return (
    <div aria-hidden className="relative w-48">
      <div className="bg-muted/40 flex flex-col gap-2.5 rounded-lg border p-3">
        <span className="flex items-center gap-2">
          <span className="bg-muted h-3 w-20 rounded-md" />
          <span className="bg-up/40 h-2 w-8 rounded-full" />
        </span>
        {rows.map((r, i) => (
          <span key={i} className="flex items-center justify-between">
            <span className={`bg-muted-foreground/40 h-1.5 rounded-full ${r.width}`} />
            <span className={`h-1.5 rounded-full opacity-70 ${r.move} ${r.size}`} />
          </span>
        ))}
      </div>
      <span className="bg-card text-brand absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full border">
        <History className="size-4" />
      </span>
    </div>
  );
}

/** The briefing page before there is an earlier visit to compare with: why, and when it fills. */
export function BriefingEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <BriefingIllustration />
      <div className="flex max-w-80 flex-col gap-1.5">
        <span className="font-semibold">Nothing to compare with yet</span>
        <span className="text-muted-foreground text-xs leading-relaxed">
          AvanzaDesk has just taken its first look at your portfolio. The next time you sign in with
          BankID, or open the app after 12 hours away, this page shows what changed while you were
          gone: your biggest moves, trades, dividends, triggered alerts and upcoming reports.
        </span>
      </div>
    </div>
  );
}
