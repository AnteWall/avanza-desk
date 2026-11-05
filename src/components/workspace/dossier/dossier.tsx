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
import { m } from "@/lib/i18n";

const names = m.workspace.dossier.what;

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
            {part(names.snapshot, <Snapshot instrument={instrument} />)}
          </div>
          <div className="border-t empty:hidden">
            {part(names.signals, <Signals instrument={instrument} />)}
          </div>
          <SectionRow>
            {part(names.profile, <About instrument={instrument} />)}
            {part(names.report, <LatestReport orderbookId={id} />)}
          </SectionRow>
          <SectionRow>
            {part(names.ratios, <KeyRatios instrument={instrument} />)}
            {part(names.financials, <FinancialsChart orderbookId={id} />)}
          </SectionRow>
          <SectionRow>
            <div className="flex flex-col">
              {part(names.analysts, <Analysts orderbookId={id} />)}
              {part(names.dividends, <Dividends orderbookId={id} />)}
            </div>
            {part(names.owners, <Owners orderbookId={id} />)}
          </SectionRow>
          <div className="border-t">{part(names.insiders, <Insiders orderbookId={id} />)}</div>
        </>
      ) : instrument.kind === "fund" ? (
        <div className="border-t">
          <Section title={m.common.fund} flush>
            {part(names.fund, <FundDetails orderbookId={id} />)}
          </Section>
        </div>
      ) : (
        focus.type === InstrumentType.Etf && (
          <div className="border-t">{part(names.etf, <EtfAbout orderbookId={id} />)}</div>
        )
      )}

      <div className="border-t">
        <Section title={m.workspace.dossier.news} flush>
          {part(names.news, <InstrumentNews orderbookId={id} />)}
        </Section>
      </div>
      <div className="border-t">
        <Section title={m.workspace.dossier.notes} flush>
          {part(names.notes, <InstrumentNotes orderbookId={id} />)}
        </Section>
      </div>
    </div>
  );
}
