import { Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";

/** The end of the briefing: nothing more to read, and what happens next time. */
export function BriefingDone({ today }: { today: boolean }) {
  return (
    <footer className="flex flex-col items-center gap-3 border-t pt-10 pb-4 text-center">
      <CircleCheck className="text-brand size-8" aria-hidden />
      <span className="text-lg font-semibold">{m.briefing.done.title}</span>
      <span className="text-muted-foreground max-w-80 text-xs leading-relaxed">
        {today ? m.briefing.done.today : m.briefing.done.since}
      </span>
      <Button variant="outline" nativeButton={false} render={<Link to="/" />} className="mt-2">
        {m.briefing.done.openWorkspace}
      </Button>
    </footer>
  );
}
