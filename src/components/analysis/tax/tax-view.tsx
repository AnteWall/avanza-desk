import { useState } from "react";

import { FeesSummary } from "@/components/analysis/tax/fees-summary";
import { IskTaxYear } from "@/components/analysis/tax/isk-tax-year";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { Skeleton } from "@/components/common/skeleton";
import { Section } from "@/components/workspace/dossier/section";
import { m } from "@/lib/i18n";
import { stockholmDay } from "@/lib/snapshots";

const statsSkeleton = <Skeleton className="h-24 w-full opacity-60" />;

/** This year's ISK tax forecast (last year as reference), then what you paid in fees. */
export function TaxView() {
  const current = Number(stockholmDay().slice(0, 4));
  const [year, setYear] = useState(String(current));
  return (
    <div className="@container flex flex-col divide-y">
      <Section
        title={m.analysis.tax.isk}
        aside={
          <Segmented
            label={m.common.year}
            options={[current, current - 1].map((y) => ({ label: String(y), value: String(y) }))}
            value={year}
            onChange={setYear}
          />
        }
      >
        <AsyncBoundary what={m.analysis.tax.loadingIsk} fallback={statsSkeleton} resetKey={year}>
          <IskTaxYear key={year} year={Number(year)} />
        </AsyncBoundary>
      </Section>
      <Section title={m.analysis.tax.fees} aside={m.analysis.tax.last12}>
        <AsyncBoundary what={m.analysis.tax.loadingFees} fallback={statsSkeleton}>
          <FeesSummary />
        </AsyncBoundary>
      </Section>
    </div>
  );
}
