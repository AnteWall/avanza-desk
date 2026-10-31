import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { YearSummary } from "@/components/portfolio/year-summary";

const thisYear = new Date().getFullYear();
const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

/** Year picker over a year's summary. */
export function YearPanel() {
  const [year, setYear] = useState(thisYear);

  return (
    <div className="flex flex-col">
      <div className="flex border-b px-3 py-1">
        <Segmented
          label="Year"
          numeric
          options={years.map((y) => ({ label: String(y), value: y }))}
          value={year}
          onChange={setYear}
        />
      </div>
      <AsyncBoundary
        what={`the ${year} summary`}
        fallback={<TableSkeleton rows={4} columns={4} />}
        resetKey={`${year}`}
      >
        <YearSummary year={year} />
      </AsyncBoundary>
    </div>
  );
}
