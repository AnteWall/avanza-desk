import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { StatList } from "@/components/analysis/stat-list";
import { Input } from "@/components/ui/input";
import { accountsQuery, portfolioRangeQuery, transactionFilterQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";
import { iskTax, iskYear, quarterStarts } from "@/lib/isk-tax";
import { getSetting, saveSetting } from "@/lib/settings";
import { stockholmDay } from "@/lib/snapshots";

// Avanza's account type code for ISK; "ISK" is accepted too in case the API shortens it.
const isIsk = (type: string) => /^(INVESTERINGSSPARKONTO|ISK)$/i.test(type);

/** One year's ISK tax: quarter values, deposits, capital base, rate (editable) and the tax. */
export function IskTaxYear({ year }: { year: number }) {
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const ids = accounts.filter((a) => isIsk(a.info.type)).map((a) => a.info.id);
  if (ids.length === 0) return <p className="text-muted-foreground">No ISK accounts.</p>;
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
            label: `Q${i + 1} start`,
            value: formatInteger(q.value),
            note: q.estimate ? "estimate: today's value" : q.day,
            sensitive: true,
          })),
          {
            label: "Deposits",
            value: formatInteger(deposited),
            note: year === Number(today.slice(0, 4)) ? "so far this year" : undefined,
            sensitive: true,
          },
          { label: "Capital base", value: formatInteger(tax.base), sensitive: true },
          {
            label: "Tax-free amount",
            value: formatInteger(known.allowance),
            note: "per person, shared with KF",
          },
          { label: "Estimated tax", value: formatInteger(tax.tax), sensitive: true },
        ]}
      />
      <label className="text-muted-foreground flex items-center gap-2 text-xs">
        Rate (bond rate 30 Nov {year - 1} + 1 pp, min 1,25 %)
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
        % · verify at skatteverket.se
      </label>
      <p className="text-muted-foreground text-xs">
        Deposits count cash deposits only; securities moved in also count for tax. Values are your
        ISK accounts at Avanza; ISK or KF elsewhere share the tax-free amount.
      </p>
    </div>
  );
}
