import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DividendChart } from "@/components/analysis/years/dividend-chart";
import { ValueChart } from "@/components/analysis/years/value-chart";
import { YearsTable } from "@/components/analysis/years/years-table";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { Section, SectionRow } from "@/components/workspace/dossier/section";
import {
  paidDividendsQuery,
  portfolioChartQuery,
  upcomingDividendsQuery,
  yearSummaryQuery,
} from "@/lib/avanza/queries";
import { formatInteger } from "@/lib/format";
import { forecastIncome } from "@/lib/income";
import { stockholmDay } from "@/lib/snapshots";
import { yearRows, yearsSince } from "@/lib/years";

/**
 * Every year since your history starts: value against money deposited, dividends per year
 * (this year with what's still expected), and the numbers per year. Suspends.
 */
export function YearsReview() {
  const today = stockholmDay();
  const thisYear = Number(today.slice(0, 4));
  const { data: all } = useSuspenseQuery(portfolioChartQuery("ALL_TIME"));
  const years = yearsSince(all.earliestAvailableDate, thisYear);
  const rows = useSuspenseQueries({
    queries: years.map((y) => yearSummaryQuery(y)),
    combine: (results) => yearRows(results.map((r, i) => ({ year: years[i]!, data: r.data }))),
  });
  const { holdings } = useHoldings();
  const [{ data: upcoming }, { data: paid }] = useSuspenseQueries({
    queries: [upcomingDividendsQuery, paidDividendsQuery],
  });

  const expected = useMemo(
    () =>
      forecastIncome(holdings, upcoming, paid, today)
        .months.filter((m) => m.month.startsWith(String(thisYear)))
        .reduce((sum, m) => sum + m.announced + m.estimated, 0),
    [holdings, upcoming, paid, today, thisYear],
  );

  const now = rows.at(-1);
  return (
    <div className="@container flex flex-col">
      {now && (
        <p className="text-muted-foreground border-b p-3">
          Since <span className="num text-foreground">{rows[0]!.year}</span> you've put in{" "}
          <span className="sensitive num text-foreground font-medium">
            {formatInteger(now.deposited)} SEK
          </span>
          , now worth{" "}
          <span className="sensitive num text-foreground font-medium">
            {formatInteger(now.end)} SEK
          </span>
          .
        </p>
      )}
      <SectionRow>
        <Section title="Value and deposits">
          <ValueChart rows={rows} />
        </Section>
        <Section title="Dividends">
          <DividendChart rows={rows} expected={expected} />
        </Section>
      </SectionRow>
      <div className="border-t">
        <YearsTable rows={rows} />
      </div>
    </div>
  );
}
