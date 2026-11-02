import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { allPositionsQuery } from "@/lib/avanza/queries";
import { LATEST_KEY, SINCE_KEY, lastVisitOf, startsVisit, type LastVisit } from "@/lib/briefing";
import { getSetting, saveSetting } from "@/lib/settings";

/**
 * Keeps the latest look at the portfolio (on session start, then hourly). Mounted per session,
 * so a sign-in after Avanza logged you out, or a return after 12 hours, starts a new visit: the
 * latest look becomes what the briefing page compares with, and the app opens on it.
 */
export function VisitTracker() {
  const navigate = useNavigate();
  const { data: positions } = useQuery({ ...allPositionsQuery, refetchInterval: 3_600_000 });

  // Before the effect below overwrites the latest look.
  useEffect(() => {
    const latest = getSetting<LastVisit | null>(LATEST_KEY, null);
    if (!startsVisit(latest, Date.now())) return;
    void saveSetting(SINCE_KEY, latest);
    void navigate({ to: "/briefing" });
  }, [navigate]);

  useEffect(() => {
    if (positions) void saveSetting(LATEST_KEY, lastVisitOf(positions, Date.now()));
  }, [positions]);

  return null;
}
