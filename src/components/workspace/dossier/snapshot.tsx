import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";

import { Change } from "@/components/common/change";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/workspace/dossier/section";
import { InstrumentType } from "@/lib/avanza/codes";
import type { Instrument } from "@/lib/avanza/instrument";
import {
  fundamentalsQuery,
  quoteQuery,
  stockAnalysisQuery,
  stockDetailsQuery,
} from "@/lib/avanza/queries";
import { insiderFlow, vsAverage } from "@/lib/avanza/stock-details";
import {
  formatCompact,
  formatDate,
  formatInteger,
  formatPercent,
  formatPrice,
  formatShare,
} from "@/lib/format";
import { openRuleDialog, type RuleDraft } from "@/lib/rule-dialog";

// `text`: a word value (a rating), not set in the numeral font. `rule`: the alert its bell
// button starts, for facts worth watching.
type Fact = { label: string; value: ReactNode; note?: string; text?: boolean; rule?: RuleDraft };

const words = (code: string) => code.toLowerCase().replaceAll("_", " ");
const DAY = 24 * 60 * 60_000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

function daysUntil(date: string) {
  const days = Math.round((Date.parse(date) - Date.now()) / DAY);
  return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/** The stock in a few plain sentences: valuation, analysts, next report, dividend, insiders. */
export function Snapshot({ instrument }: { instrument: Instrument }) {
  const id = instrument.orderbookId;
  const { data } = useSuspenseQuery(fundamentalsQuery(id));
  // Decorations: a fact appears once its source loads, and a failing source just drops it.
  const { data: quote } = useQuery(quoteQuery(id));
  const { data: analysis } = useQuery(stockAnalysisQuery(id));
  const { data: details } = useQuery(stockDetailsQuery(id));
  const ki = instrument.stock!.keyIndicators;
  const last = quote?.last;
  const facts: Fact[] = [];
  const target = { id, name: instrument.name, type: InstrumentType.Stock };

  // P/E means nothing with a loss; EV/EBIT is the fallback.
  const pe = analysis?.keyRatiosByYear.priceEarningsRatio;
  const [ratioName, ratio] =
    vsAverage(pe?.latest, pe?.average) != null
      ? ["P/E", pe]
      : ["EV/EBIT", analysis?.keyRatiosByYear.evEbitRatio];
  const delta = vsAverage(ratio?.latest, ratio?.average);
  if (ratio?.latest != null && delta != null)
    facts.push({
      label: "Valuation",
      value: `${ratioName} ${formatPrice(ratio.latest)}`,
      note: `${formatShare(Math.abs(delta))} ${delta >= 0 ? "above" : "below"} its own average of ${formatPrice(ratio.average!)}`,
    });

  const rec = data.recommendations;
  // Avanza omits the consensus (and report type below) for some instruments despite the types.
  if (rec?.consensusAction)
    facts.push({
      label: "Analysts",
      value: <span className="capitalize">{words(rec.consensusAction)}</span>,
      text: true,
      rule: { kind: "signal", signalKind: "consensus", target },
      note: `${rec.numberOfBuy + rec.numberOfOutperform} buy · ${rec.numberOfHold} hold · ${rec.numberOfSell + rec.numberOfUnderperform} sell`,
    });

  const targets = data.targets;
  if (targets?.numberOfEstimates && last)
    facts.push({
      label: "Price target",
      value: <Change ratio={targets.averagePriceTarget / last - 1} />,
      rule: { kind: "upside", target },
      note: `Average ${formatPrice(targets.averagePriceTarget)} from ${targets.numberOfEstimates} analysts`,
    });

  if (ki.nextReport)
    facts.push({
      label: "Next report",
      value: formatDate(ki.nextReport.date),
      rule: { kind: "signal", signalKind: "report", target, threshold: 1 },
      note: ki.nextReport.reportType
        ? `${words(ki.nextReport.reportType)} report, ${daysUntil(ki.nextReport.date)}`
        : daysUntil(ki.nextReport.date),
    });

  const upcoming = details?.dividends?.events[0];
  const lastPaid = details?.dividends?.pastEvents[0];
  if (ki.directYield != null || upcoming)
    facts.push({
      label: "Dividend yield",
      value: ki.directYield != null ? formatShare(ki.directYield) : "–",
      note: upcoming
        ? `Ex-date ${formatDate(upcoming.exDate)}: ${formatPrice(upcoming.amount)} ${upcoming.currencyCode}`
        : lastPaid
          ? `Last ${formatPrice(lastPaid.amount)} ${lastPaid.currencyCode} on ${formatDate(lastPaid.exDate)}`
          : undefined,
    });

  const trades = data.insiders?.transactions ?? [];
  if (trades.length) {
    const flow = insiderFlow(trades, isoDaysAgo(90));
    facts.push({
      label: "Insiders, 3 months",
      value:
        flow.buys + flow.sells === 0
          ? "No trades"
          : `${flow.net > 0 ? "Net bought" : "Net sold"} ${formatCompact(Math.abs(flow.net))} ${flow.currency}`,
      rule: { kind: "signal", signalKind: "insider", target },
      note: `${flow.buys} buys · ${flow.sells} sells`,
    });
  }

  if (ki.shortSellingRatio != null)
    facts.push({
      label: "Short interest",
      value: formatShare(ki.shortSellingRatio),
      rule: { kind: "short", target },
    });

  const owners = data.owners;
  if (owners)
    facts.push({
      label: "Avanza owners",
      value: formatInteger(ki.numberOfOwners),
      rule: { kind: "signal", signalKind: "owners", target },
      // Avanza sends percent units.
      note: `${formatPercent(owners.historySummary.oneYearChangePercent / 100)} in a year`,
    });

  if (facts.length === 0) return null;
  return (
    <Section title="At a glance">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @2xl:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="group min-w-0">
            <dt className="text-muted-foreground flex h-4 items-center gap-1 text-xs">
              {f.label}
              {f.rule && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Alert me about ${f.label.toLowerCase()}`}
                  title="Create an alert rule"
                  // Shown on hover or keyboard focus, so the facts stay calm.
                  className="size-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => openRuleDialog(f.rule)}
                >
                  <Bell className="size-3" />
                </Button>
              )}
            </dt>
            <dd className={cn("text-base font-medium", !f.text && "num")}>{f.value}</dd>
            {f.note && <dd className="text-muted-foreground text-xs">{f.note}</dd>}
          </div>
        ))}
      </dl>
    </Section>
  );
}
