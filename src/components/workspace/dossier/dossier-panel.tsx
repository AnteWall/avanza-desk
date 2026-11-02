import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { ChartPeriod } from "avanza-ts";
import { FileText, PictureInPicture2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { headerSkeleton } from "@/components/workspace/chart/chart-body";
import { Dossier } from "@/components/workspace/dossier/dossier";
import { Panel } from "@/components/workspace/panel";
import { useFocusedInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentQuery } from "@/lib/avanza/queries";
import { isTyping } from "@/lib/keys";
import { openPopout } from "@/lib/popout";

const ranges: { label: string; period: ChartPeriod }[] = [
  { label: "1D", period: "today" },
  { label: "1W", period: "one_week" },
  { label: "1M", period: "one_month" },
  { label: "YTD", period: "this_year" },
  { label: "1Y", period: "one_year" },
  { label: "5Y", period: "five_years" },
];

// Funds are priced once a day, so they have no 1D chart.
const visibleRanges = (fund: boolean) => ranges.filter((r) => !(fund && r.period === "today"));

/** The focused instrument as one scrolling page; the actions pick the chart range. */
export function DossierPanel() {
  const focus = useFocusedInstrument();
  const [period, setPeriod] = useState<ChartPeriod>("today");
  // Shares the body's cached lookup; only used to hide 1D for funds.
  const { data: instrument } = useQuery({
    ...instrumentQuery(focus?.id ?? "", focus?.type),
    enabled: !!focus,
  });
  const fund = instrument?.kind === "fund";
  const active = fund && period === "today" ? "one_month" : period;
  const shown = visibleRanges(fund);
  const inPopout = useRouterState({ select: (s) => s.location.pathname === "/popout" });

  // 1… picks a range, counting the buttons shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e)) return;
      const range = visibleRanges(fund)[Number(e.key) - 1];
      if (range) setPeriod(range.period);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fund]);

  return (
    <Panel
      title="Overview"
      icon={FileText}
      actions={
        <>
          <Segmented
            label="Chart range"
            numeric
            options={shown.map((r, i) => ({
              label: r.label,
              value: r.period,
              title: `${r.label} (${i + 1})`,
            }))}
            value={active}
            onChange={setPeriod}
          />
          {focus && !inPopout && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="Open in a new window"
              title="Open in a new window"
              onClick={() =>
                void openPopout(focus.id, instrument?.shortName ?? "Instrument", focus.type)
              }
            >
              <PictureInPicture2 />
            </Button>
          )}
        </>
      }
    >
      {focus ? (
        <AsyncBoundary
          what="this instrument"
          fallback={<div className="p-3">{headerSkeleton}</div>}
          resetKey={focus.id}
        >
          {/* Keyed so a new instrument starts at the top of the page. */}
          <div key={focus.id} className="h-full overflow-auto">
            <Dossier focus={focus} period={period} />
          </div>
        </AsyncBoundary>
      ) : (
        <p className="text-muted-foreground p-3">
          Pick an instrument from your watchlist or Ctrl K.
        </p>
      )}
    </Panel>
  );
}
