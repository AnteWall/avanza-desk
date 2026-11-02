import { useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "avanza-ts";
import type { ReactNode } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { ChartBody } from "@/components/workspace/chart/chart-body";
import { About } from "@/components/workspace/dossier/about";
import { Analysts } from "@/components/workspace/dossier/analysts";
import { Dividends } from "@/components/workspace/dossier/dividends";
import { EtfAbout } from "@/components/workspace/dossier/etf-about";
import { FinancialsChart } from "@/components/workspace/dossier/financials-chart";
import { Insiders } from "@/components/workspace/dossier/insiders";
import { KeyRatios } from "@/components/workspace/dossier/key-ratios";
import { LatestReport } from "@/components/workspace/dossier/latest-report";
import { Owners } from "@/components/workspace/dossier/owners";
import { ReturnsStrip } from "@/components/workspace/dossier/returns-strip";
import { Section, SectionRow } from "@/components/workspace/dossier/section";
import { Signals } from "@/components/workspace/dossier/signals";
import { Snapshot } from "@/components/workspace/dossier/snapshot";
import { FundDetails } from "@/components/workspace/fundamentals/fund-details";
import { InstrumentNews } from "@/components/workspace/news/instrument-news";
import { InstrumentNotes } from "@/components/workspace/notes/instrument-notes";
import type { Focus } from "@/components/workspace/use-focused-instrument";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";

const skeleton = (
  <div className="flex flex-col gap-2 p-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-16 w-full opacity-60" />
  </div>
);

/**
 * Everything about the focused instrument on one scrolling page: price and chart, then what a
 * reader needs to judge it, most decisive first. Each part loads and fails on its own.
 */
export function Dossier({ focus, period }: { focus: Focus; period: ChartPeriod }) {
  const { data: instrument } = useSuspenseQuery(instrumentQuery(focus.id, focus.type));
  const id = instrument.orderbookId;
  const part = (what: string, node: ReactNode) => (
    <AsyncBoundary what={what} fallback={skeleton} compact resetKey={id}>
      {node}
    </AsyncBoundary>
  );

  return (
    <div className="@container flex flex-col">
      <div className="h-96 shrink-0">
        <ChartBody focus={focus} period={period} />
      </div>
      {instrument.kind === "listed" && <ReturnsStrip instrument={instrument} />}

      {instrument.stock ? (
        <>
          <div className="border-t">
            {part("the snapshot", <Snapshot instrument={instrument} />)}
          </div>
          <div className="border-t empty:hidden">
            {part("signals", <Signals instrument={instrument} />)}
          </div>
          <SectionRow>
            {part("the company profile", <About instrument={instrument} />)}
            {part("the latest report", <LatestReport orderbookId={id} />)}
          </SectionRow>
          <SectionRow>
            {part("key ratios", <KeyRatios instrument={instrument} />)}
            {part("financials", <FinancialsChart orderbookId={id} />)}
          </SectionRow>
          <SectionRow>
            <div className="flex flex-col">
              {part("analyst views", <Analysts orderbookId={id} />)}
              {part("dividends", <Dividends orderbookId={id} />)}
            </div>
            {part("owners", <Owners orderbookId={id} />)}
          </SectionRow>
          <div className="border-t">{part("insider trades", <Insiders orderbookId={id} />)}</div>
        </>
      ) : instrument.kind === "fund" ? (
        <div className="border-t">
          <Section title="Fund" flush>
            {part("fund details", <FundDetails orderbookId={id} />)}
          </Section>
        </div>
      ) : (
        focus.type === InstrumentType.Etf && (
          <div className="border-t">{part("ETF details", <EtfAbout orderbookId={id} />)}</div>
        )
      )}

      <div className="border-t">
        <Section title="News" flush>
          {part("news", <InstrumentNews orderbookId={id} />)}
        </Section>
      </div>
      <div className="border-t">
        <Section title="Your notes" flush>
          {part("your notes", <InstrumentNotes orderbookId={id} />)}
        </Section>
      </div>
    </div>
  );
}
