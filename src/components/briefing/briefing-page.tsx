import { BriefingEmpty } from "@/components/briefing/briefing-empty";
import { BriefingView } from "@/components/briefing/briefing-view";
import { SINCE_KEY, type LastVisit } from "@/lib/briefing";
import { getSetting } from "@/lib/settings";

/**
 * What changed since your last visit. A visit starts when you sign in again or come back after
 * 12 hours (see `VisitTracker`); until then this page stays put.
 */
export function BriefingPage() {
  const since = getSetting<LastVisit | null>(SINCE_KEY, null);
  return since ? (
    <BriefingView since={since} />
  ) : (
    <div className="bg-card h-full rounded-md border">
      <BriefingEmpty />
    </div>
  );
}
