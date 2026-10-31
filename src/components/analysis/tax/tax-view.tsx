import { useState } from "react";

import { FeesSummary } from "@/components/analysis/tax/fees-summary";
import { IskTaxYear } from "@/components/analysis/tax/isk-tax-year";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { Skeleton } from "@/components/common/skeleton";
import { Section } from "@/components/workspace/dossier/section";
import { stockholmDay } from "@/lib/snapshots";

const statsSkeleton = <Skeleton className="h-24 w-full opacity-60" />;

/** This year's ISK tax forecast (last year as reference), then what you paid in fees. */
export function TaxView() {
  const current = Number(stockholmDay().slice(0, 4));
  const [year, setYear] = useState(String(current));
  return (
    <div className="@container flex flex-col divide-y">
      <Section
        title="ISK tax"
        aside={
          <Segmented
            label="Year"
            options={[current, current - 1].map((y) => ({ label: String(y), value: String(y) }))}
            value={year}
            onChange={setYear}
          />
        }
      >
        <AsyncBoundary what="your ISK tax" fallback={statsSkeleton} resetKey={year}>
          <IskTaxYear key={year} year={Number(year)} />
        </AsyncBoundary>
      </Section>
      <Section title="Fees" aside="last 12 months">
        <AsyncBoundary what="your fees" fallback={statsSkeleton}>
          <FeesSummary />
        </AsyncBoundary>
      </Section>
    </div>
  );
}
