import { useSyncExternalStore } from "react";

import { getChartView, subscribeChartView } from "@/lib/chart-view";

export const useChartView = () => useSyncExternalStore(subscribeChartView, getChartView);
