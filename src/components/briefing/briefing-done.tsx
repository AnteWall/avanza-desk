import { Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The end of the briefing: nothing more to read, and what happens next time. */
export function BriefingDone() {
  return (
    <footer className="flex flex-col items-center gap-3 border-t pt-10 pb-4 text-center">
      <CircleCheck className="text-brand size-8" aria-hidden />
      <span className="text-lg font-semibold">You're all caught up</span>
      <span className="text-muted-foreground max-w-80 text-xs leading-relaxed">
        This page stays as it is until your next visit: when you sign in again, or open AvanzaDesk
        after 12 hours away.
      </span>
      <Button variant="outline" render={<Link to="/" />} className="mt-2">
        Open the workspace
      </Button>
    </footer>
  );
}
