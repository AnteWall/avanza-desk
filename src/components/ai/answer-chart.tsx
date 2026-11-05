import { useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod, PerformancePeriod } from "avanza-ts";

import { Change } from "@/components/common/change";
import { type ChartPoint, PriceChart } from "@/components/common/price-chart";
import { PortfolioChart } from "@/components/portfolio/portfolio-chart";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import type { AnswerBlock } from "@/lib/ai/blocks";
import { InstrumentType } from "@/lib/avanza/codes";
import { fundChartQuery, instrumentQuery, priceChartQuery } from "@/lib/avanza/queries";
import { formatPercent } from "@/lib/format";
import { m } from "@/lib/i18n";

const p = m.ai.chart.periods;
const periods: Record<ChartPeriod | PerformancePeriod, string> = {
  today: p.today,
  one_week: p.oneWeek,
  one_month: p.oneMonth,
  three_months: p.threeMonths,
  this_year: p.thisYear,
  one_year: p.oneYear,
  three_years: p.threeYears,
  five_years: p.fiveYears,
  infinity: p.all,
  TODAY: p.today,
  ONE_WEEK: p.oneWeek,
  ONE_MONTH: p.oneMonth,
  THREE_MONTHS: p.threeMonths,
  THIS_YEAR: p.thisYear,
  ONE_YEAR: p.oneYear,
  THREE_YEARS: p.threeYears,
  FIVE_YEARS: p.fiveYears,
  ALL_TIME: p.all,
};

// Fund series are % development since the period start, in percent units.
const formatDevelopment = (v: number) => formatPercent(v / 100);

type PriceBlock = Extract<AnswerBlock, { kind: "price" }>;

function FundHistory({ block }: { block: PriceBlock }) {
  const { data } = useSuspenseQuery(fundChartQuery(block.orderbookId, block.period));
  const points = data.dataSerie.map((p) => ({ timestamp: p.x, value: p.y }));
  return <History block={block} points={points} fund />;
}

function ListedHistory({ block }: { block: PriceBlock }) {
  const { data } = useSuspenseQuery(priceChartQuery(block.orderbookId, block.period, false));
  const points = data.ohlc.map((p) => ({ timestamp: p.timestamp, value: p.close }));
  return <History block={block} points={points} fund={false} />;
}

function History({
  block,
  points,
  fund,
}: {
  block: PriceBlock;
  points: ChartPoint[];
  fund: boolean;
}) {
  const focus = useFocusInstrument();
  const { data: instrument } = useSuspenseQuery(instrumentQuery(block.orderbookId, block.type));
  const first = points[0]?.value;
  const last = points.at(-1)?.value;
  // Fund series are % development since the start; prices compare directly.
  const change =
    first == null || last == null
      ? null
      : fund
        ? (100 + last) / (100 + first) - 1
        : first
          ? last / first - 1
          : null;

  return (
    <>
      <header className="flex items-center gap-2 px-3 pt-2">
        <button
          type="button"
          onClick={() => focus(block.orderbookId, block.type)}
          className="truncate font-medium hover:underline"
        >
          {instrument.name}
        </button>
        <span className="text-muted-foreground text-xs">{periods[block.period]}</span>
        {change != null && <Change ratio={change} className="ml-auto text-xs" />}
      </header>
      <div className="h-44 px-1 pb-1">
        {points.length === 0 ? (
          <p className="text-muted-foreground p-3 text-xs">{m.ai.chart.noHistory}</p>
        ) : (
          <PriceChart
            points={points}
            intraday={block.period === "today"}
            {...(fund && {
              formatValue: formatDevelopment,
              valueLabel: m.common.development,
              previousClose: 0,
            })}
          />
        )}
      </div>
    </>
  );
}

/** A chart the assistant asked for, drawn from the app's own data. */
export function AnswerChart({
  block,
}: {
  block: Extract<AnswerBlock, { kind: "price" | "portfolio" }>;
}) {
  if (block.kind === "price") {
    return block.type === InstrumentType.Fund ? (
      <FundHistory block={block} />
    ) : (
      <ListedHistory block={block} />
    );
  }
  return (
    <>
      <header className="flex items-center gap-2 px-3 pt-2">
        <span className="font-medium">
          {block.mode === "value" ? m.ai.chart.portfolioValue : m.ai.chart.portfolioReturn}
        </span>
        <span className="text-muted-foreground text-xs">{periods[block.period]}</span>
      </header>
      <div className="h-44 px-1 pb-1">
        <PortfolioChart period={block.period} mode={block.mode} />
      </div>
    </>
  );
}
