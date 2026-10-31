import { useSuspenseQuery } from "@tanstack/react-query";

import { Section } from "@/components/workspace/dossier/section";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import { reportText } from "@/lib/avanza/stock-details";

/** Avanza's written summary of the latest company report, with its highlights. */
export function LatestReport({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(stockDetailsQuery(orderbookId));
  const report = data.companyReports?.find((r) => r.companyReportSummary?.summary);
  const summary = report?.companyReportSummary;
  if (!report || !summary) return null;

  const { reportPeriod, financialYear } = report.reportPeriodAndYear;
  return (
    <Section title="Latest report" aside={`${reportPeriod} ${financialYear}`}>
      <div className="flex max-w-prose flex-col gap-2 leading-relaxed">
        {reportText(summary.summary)
          .split("\n")
          .filter(Boolean)
          .map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        {!!summary.highlights?.length && (
          <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4">
            {summary.highlights.map((h) => (
              <li key={h}>{reportText(h)}</li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
