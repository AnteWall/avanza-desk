import { createFileRoute } from "@tanstack/react-router";

import { AnalysisPage } from "@/components/analysis/analysis-page";

export const Route = createFileRoute("/analysis")({
  component: AnalysisPage,
});
