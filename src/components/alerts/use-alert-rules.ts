import { useSyncExternalStore } from "react";

import { getRules, subscribeRules } from "@/lib/alert-rules";

/** The local alert rules, re-rendering when they change. */
export const useAlertRules = () => useSyncExternalStore(subscribeRules, getRules);
