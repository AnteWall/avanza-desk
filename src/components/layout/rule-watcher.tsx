import { useEffect } from "react";

import { useAlertRules } from "@/components/alerts/use-alert-rules";
import { useRuleState } from "@/components/alerts/use-rule-state";
import { notify } from "@/components/layout/notifier";
import { evaluateRules, getFired, setFired, unfired } from "@/lib/alert-rules";
import { getNotifications } from "@/lib/notifications";
import { stockholmDay } from "@/lib/snapshots";

/**
 * Checks the local alert rules (Alerts → Rules) whenever their data refreshes and sends a
 * desktop notification for each new hit. Only fetches what the existing rules need. Renders
 * nothing. Notifications name percentages, never your amounts, so privacy mode needs no case.
 */
export function RuleWatcher() {
  const rules = useAlertRules();
  const state = useRuleState(rules);

  useEffect(() => {
    if (!state || rules.length === 0) return;
    const { fresh, next } = unfired(evaluateRules(rules, state), getFired(), stockholmDay());
    if (fresh.length === 0) return;
    void setFired(next);
    // Still marked fired when muted, so turning notifications back on doesn't replay old hits.
    if (getNotifications().rules) for (const f of fresh) void notify(f.title, f.body);
  }, [rules, state]);

  return null;
}
