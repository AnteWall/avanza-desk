import { useState } from "react";

import { BriefingView } from "@/components/briefing/briefing-view";
import { Segmented } from "@/components/common/segmented";
import { SINCE_KEY, type LastVisit } from "@/lib/briefing";
import { m } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";

const views = [
  { value: "visit", label: m.briefing.views.visit },
  { value: "today", label: m.briefing.views.today },
] as const;

/**
 * Home: what changed since your last visit (a visit starts when you sign in again or come back
 * after 12 hours, see `VisitTracker`), or today's story when there is no earlier visit yet.
 */
export function BriefingPage() {
  const since = getSetting<LastVisit | null>(SINCE_KEY, null);
  const [view, setView] = useState<"visit" | "today">("visit");
  return (
    <BriefingView
      key={view}
      since={view === "visit" ? (since ?? undefined) : undefined}
      switcher={
        since && (
          <Segmented label={m.briefing.homeView} options={views} value={view} onChange={setView} />
        )
      }
    />
  );
}
