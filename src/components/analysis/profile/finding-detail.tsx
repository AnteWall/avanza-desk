import { Sparkles } from "lucide-react";
import { useState } from "react";

import { useAssistantEnabled } from "@/components/ai/use-assistant-enabled";
import { EvidenceTable } from "@/components/analysis/profile/evidence-table";
import { FindingTrend } from "@/components/analysis/profile/finding-trend";
import { FindingWhy } from "@/components/analysis/profile/finding-why";
import { ToneLabel } from "@/components/analysis/profile/tone-label";
import { TrendLabel } from "@/components/analysis/profile/trend-label";
import { Segmented } from "@/components/common/segmented";
import { SignedAmount } from "@/components/common/signed-amount";
import { Button } from "@/components/ui/button";
import { askAssistant } from "@/lib/ai/ask";
import { m } from "@/lib/i18n";
import { directionLabel, PROFILE_YEARS, statusLabel, type Finding } from "@/lib/trading-profile";

const ask = (f: Finding) =>
  askAssistant({
    items: [
      { kind: "page", label: `${m.layout.pages.analysis.label} · ${m.analysis.tabs.profile}` },
    ],
    prompt: `My trading profile checked my trades and concluded "${f.title}" (${statusLabel[f.status].toLowerCase()}). ${f.detail} The rule: ${f.rule}${f.advice ? ` Its advice: ${f.advice.text}` : ""}${f.trend ? ` ${f.metric.label}: ${f.trend.recent} in the last 12 months against ${f.trend.before} before (${directionLabel[f.trend.direction].toLowerCase()}).` : ""} Look at my buy and sell transactions over the last ${PROFILE_YEARS} years and explain what drives this: which stocks, which periods, and whether that advice fits me or what I should do instead.`,
    send: true,
  });

/**
 * One check, most decisive first: verdict and what to do, its number over time, then the trades
 * or the reasoning behind it, one at a time.
 */
export function FindingDetail({ finding }: { finding: Finding }) {
  const assistant = useAssistantEnabled();
  const [view, setView] = useState<"trades" | "why">("trades");
  return (
    <div className="flex flex-col divide-y">
      <header className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-base font-semibold">{finding.title}</h2>
          {finding.impact != null && (
            <SignedAmount value={finding.impact} className="sensitive text-base font-semibold" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {finding.advice ? (
            <ToneLabel tone={finding.advice.tone} />
          ) : (
            <span className="text-muted-foreground">{statusLabel[finding.status]}</span>
          )}
          {finding.trend && finding.trend.direction !== "steady" && (
            <>
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <TrendLabel direction={finding.trend.direction} />
            </>
          )}
          {assistant && (
            <Button variant="outline" size="xs" className="ml-auto" onClick={() => ask(finding)}>
              <Sparkles className="size-3.5" aria-hidden />
              {m.analysis.profile.ask}
            </Button>
          )}
        </div>
        {finding.advice && <p className="max-w-3xl">{finding.advice.text}</p>}
      </header>
      <FindingTrend finding={finding} />
      <div className="flex flex-col">
        <div className="flex h-10 items-center px-3">
          <Segmented
            label={m.analysis.profile.show}
            options={[
              { label: m.analysis.profile.tradesCount(finding.evidence.length), value: "trades" },
              { label: m.analysis.profile.howMeasured, value: "why" },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
        {view === "trades" ? <EvidenceTable finding={finding} /> : <FindingWhy finding={finding} />}
      </div>
    </div>
  );
}
