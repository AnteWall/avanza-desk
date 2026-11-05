import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";

import { Change } from "@/components/common/change";
import { InfoTip } from "@/components/common/info-tip";
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
  formatDay,
  formatInteger,
  formatPercent,
  formatPrice,
  formatShare,
} from "@/lib/format";
import { m } from "@/lib/i18n";
import { openRuleDialog, type RuleDraft } from "@/lib/rule-dialog";

// `text`: a word value (a rating), not set in the numeral font. `rule`: the alert its bell
// button starts, for facts worth watching.
type Fact = {
  label: string;
  value: ReactNode;
  note?: string;
  text?: boolean;
  rule?: RuleDraft;
  /** A sentence on what the value means, behind an ⓘ. */
  tip?: string;
};

const t = m.workspace.snapshot;
const words = (code: string) => code.toLowerCase().replaceAll("_", " ");
const DAY = 24 * 60 * 60_000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

function daysUntil(date: string) {
  const days = Math.round((Date.parse(date) - Date.now()) / DAY);
  return days <= 0 ? t.today : days === 1 ? t.tomorrow : t.inDays(days);
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
      label: t.valuation,
      value: `${ratioName} ${formatPrice(ratio.latest)}`,
      note: t.vsOwnAverage(formatShare(Math.abs(delta)), delta >= 0, formatPrice(ratio.average!)),
    });

  const rec = data.recommendations;
  // Avanza omits the consensus (and report type below) for some instruments despite the types.
  if (rec?.consensusAction)
    facts.push({
      label: t.analysts,
      value: (
        <span className="capitalize">
          {m.workspace.analysts.consensus[rec.consensusAction] ?? words(rec.consensusAction)}
        </span>
      ),
      text: true,
      rule: { kind: "signal", signalKind: "consensus", target },
      note: m.workspace.analysts.split(
        rec.numberOfBuy + rec.numberOfOutperform,
        rec.numberOfHold,
        rec.numberOfSell + rec.numberOfUnderperform,
      ),
    });

  const targets = data.targets;
  if (targets?.numberOfEstimates && last)
    facts.push({
      label: t.priceTarget,
      value: <Change ratio={targets.averagePriceTarget / last - 1} />,
      rule: { kind: "upside", target },
      note: t.targetNote(formatPrice(targets.averagePriceTarget), targets.numberOfEstimates),
    });

  if (ki.nextReport)
    facts.push({
      label: t.nextReport,
      value: formatDay(ki.nextReport.date),
      rule: { kind: "signal", signalKind: "report", target, threshold: 1 },
      note: ki.nextReport.reportType
        ? t.reportNote(
            t.reportTypes[ki.nextReport.reportType] ?? words(ki.nextReport.reportType),
            daysUntil(ki.nextReport.date),
          )
        : daysUntil(ki.nextReport.date),
    });

  const upcoming = details?.dividends?.events[0];
  const lastPaid = details?.dividends?.pastEvents[0];
  if (ki.directYield != null || upcoming)
    facts.push({
      label: t.dividendYield,
      value: ki.directYield != null ? formatShare(ki.directYield) : "–",
      note: upcoming
        ? t.exDate(
            formatDay(upcoming.exDate),
            `${formatPrice(upcoming.amount)} ${upcoming.currencyCode}`,
          )
        : lastPaid
          ? t.lastPaid(
              `${formatPrice(lastPaid.amount)} ${lastPaid.currencyCode}`,
              formatDay(lastPaid.exDate),
            )
          : undefined,
    });

  const trades = data.insiders?.transactions ?? [];
  if (trades.length) {
    const flow = insiderFlow(trades, isoDaysAgo(90));
    facts.push({
      label: t.insiders,
      value:
        flow.buys + flow.sells === 0
          ? t.noTrades
          : (flow.net > 0 ? t.netBought : t.netSold)(
              `${formatCompact(Math.abs(flow.net))} ${flow.currency}`,
            ),
      rule: { kind: "signal", signalKind: "insider", target },
      note: t.buysSells(flow.buys, flow.sells),
    });
  }

  if (ki.shortSellingRatio != null)
    facts.push({
      label: t.shortInterest,
      value: formatShare(ki.shortSellingRatio),
      tip: t.shortTip,
      rule: { kind: "short", target },
    });

  const owners = data.owners;
  if (owners)
    facts.push({
      label: t.avanzaOwners,
      value: formatInteger(ki.numberOfOwners),
      rule: { kind: "signal", signalKind: "owners", target },
      // Avanza sends percent units.
      note: t.inAYear(formatPercent(owners.historySummary.oneYearChangePercent)),
    });

  if (facts.length === 0) return null;
  return (
    <Section title={t.title}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @2xl:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="group min-w-0">
            <dt className="text-muted-foreground flex h-4 items-center gap-1 text-xs">
              {f.label}
              {f.tip && <InfoTip label={f.label.toLowerCase()}>{f.tip}</InfoTip>}
              {f.rule && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t.alertAbout(f.label.toLowerCase())}
                  title={t.createRule}
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
