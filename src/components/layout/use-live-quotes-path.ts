import { useSyncExternalStore } from "react";

import { getLiveQuotesPath, subscribeLiveQuotesPath } from "@/lib/live-quotes-file";

export const useLiveQuotesPath = () =>
  useSyncExternalStore(subscribeLiveQuotesPath, getLiveQuotesPath);
