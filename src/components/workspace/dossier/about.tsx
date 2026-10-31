import { useSuspenseQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatList } from "@/components/workspace/chart/stat-list";
import { Section } from "@/components/workspace/dossier/section";
import type { Instrument } from "@/lib/avanza/instrument";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import { formatCompact } from "@/lib/format";

/** What the company does, who runs it and how big it is. */
export function About({ instrument }: { instrument: Instrument }) {
  const { data } = useSuspenseQuery(stockDetailsQuery(instrument.orderbookId));
  const company = data.company;
  const cap = instrument.stock?.keyIndicators.marketCapital;

  const stats = [
    instrument.sector && { label: "Sector", value: instrument.sector, text: true },
    cap && { label: "Market cap", value: `${formatCompact(cap.value)} ${cap.currency}` },
    company?.totalNumberOfShares && {
      label: "Shares",
      value: formatCompact(company.totalNumberOfShares),
    },
    company?.ceo && { label: "CEO", value: company.ceo, text: true },
    company?.chairman && { label: "Chairman", value: company.chairman, text: true },
  ].filter((s) => !!s);

  if (!company?.description && stats.length === 0) return null;
  return (
    <Section
      title="About"
      aside={
        company?.homepage && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => void openUrl(company.homepage!)}
          >
            Investor site <ArrowUpRight />
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {company?.description && (
          <p className="max-w-prose leading-relaxed">{company.description}</p>
        )}
        <StatList stats={stats} />
      </div>
    </Section>
  );
}
