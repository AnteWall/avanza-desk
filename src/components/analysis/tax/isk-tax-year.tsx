import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { StatList } from "@/components/analysis/stat-list";
import { Input } from "@/components/ui/input";
import { accountsQuery, portfolioRangeQuery, transactionFilterQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";
import { iskTax, iskYear, quarterStarts } from "@/lib/isk-tax";
import { getSetting, saveSetting } from "@/lib/settings";
import { stockholmDay } from "@/lib/snapshots";

// Avanza's account type code for ISK; "ISK" is accepted too in case the API shortens it.
const isIsk = (type: string) => /^(INVESTERINGSSPARKONTO|ISK)$/i.test(type);

/** One year's ISK tax: quarter values, deposits, capital base, rate (editable) and the tax. */
export function IskTaxYear({ year }: { year: number }) {
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const ids = accounts.filter((a) => isIsk(a.info.type)).map((a) => a.info.id);
  if (ids.length === 0) return <p className="text-muted-foreground">{m.analysis.tax.noIsk}</p>;
  return <IskTaxFor year={year} ids={ids} />;
}

function IskTaxFor({ year, ids }: { year: number; ids: string[] }) {
  const today = stockholmDay();
  const from = `${year}-01-01`;
  const to = `${year}-12-31` < today ? `${year}-12-31` : today;
  const [{ data: chart }, { data: deposits }] = useSuspenseQueries({
    queries: [
      portfolioRangeQuery({ from, to }, ids),
      transactionFilterQuery({ from, to, accountIds: ids, transactionTypes: ["DEPOSIT"] }),
    ],
  });
  const known = iskYear(year);
  const [rate, setRate] = useState(() => getSetting(`isk-rate:${year}`, known.rate));

  const latest = chart.valueSeries.at(-1)?.performance.value ?? 0;
  const quarters = quarterStarts(year).map((day) => {
    const point = chart.valueSeries.find((p) => p.timestamp >= Date.parse(day));
    // Quarters not reached yet count with today's value.
    return day > today || !point
      ? { day, value: latest, estimate: true }
      : { day, value: point.performance.value, estimate: false };
  });
  const deposited = deposits.transactions
    .filter((t) => !t.cancelled)
    .reduce((sum, t) => sum + Math.abs(t.amount?.value ?? 0), 0);
  const tax = iskTax({
    quarterValues: quarters.map((q) => q.value),
    deposits: deposited,
    rate,
    allowance: known.allowance,
  });

  return (
    <div className="flex flex-col gap-3">
      <StatList
        stats={[
          ...quarters.map((q, i) => ({
            label: m.analysis.tax.quarter(i + 1),
            value: formatInteger(q.value),
            note: q.estimate ? m.analysis.tax.estimateToday : q.day,
            sensitive: true,
          })),
          {
            label: m.analysis.tax.deposits,
            value: formatInteger(deposited),
            note: year === Number(today.slice(0, 4)) ? m.analysis.tax.soFar : undefined,
            sensitive: true,
          },
          { label: m.analysis.tax.base, value: formatInteger(tax.base), sensitive: true },
          {
            label: m.analysis.tax.allowance,
            value: formatInteger(known.allowance),
            note: m.analysis.tax.allowanceNote,
          },
          { label: m.analysis.tax.estimatedTax, value: formatInteger(tax.tax), sensitive: true },
        ]}
      />
      <label className="text-muted-foreground flex items-center gap-2 text-xs">
        {m.analysis.tax.rate(year - 1)}
        <Input
          type="number"
          step={0.01}
          min={0}
          className="num h-7 w-20 text-right"
          defaultValue={formatPrice(rate * 100).replace(",", ".")}
          onChange={(e) => {
            const v = e.currentTarget.valueAsNumber;
            if (!Number.isFinite(v)) return;
            setRate(v / 100);
            void saveSetting(`isk-rate:${year}`, v / 100);
          }}
        />
        {m.analysis.tax.verify}
      </label>
      <p className="text-muted-foreground text-xs">{m.analysis.tax.footnote}</p>
    </div>
  );
}
