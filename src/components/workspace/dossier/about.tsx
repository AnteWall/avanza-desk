import { useSuspenseQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatList } from "@/components/workspace/chart/stat-list";
import { Section } from "@/components/workspace/dossier/section";
import type { Instrument } from "@/lib/avanza/instrument";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import { formatCompact } from "@/lib/format";
import { m } from "@/lib/i18n";

/** What the company does, who runs it and how big it is. */
export function About({ instrument }: { instrument: Instrument }) {
  const { data } = useSuspenseQuery(stockDetailsQuery(instrument.orderbookId));
  const company = data.company;
  const cap = instrument.stock?.keyIndicators.marketCapital;

  const stats = [
    instrument.sector && { label: m.workspace.about.sector, value: instrument.sector, text: true },
    cap && {
      label: m.workspace.about.marketCap,
      value: `${formatCompact(cap.value)} ${cap.currency}`,
    },
    company?.totalNumberOfShares && {
      label: m.workspace.about.shares,
      value: formatCompact(company.totalNumberOfShares),
    },
    company?.ceo && { label: m.workspace.about.ceo, value: company.ceo, text: true },
    company?.chairman && { label: m.workspace.about.chairman, value: company.chairman, text: true },
  ].filter((s) => !!s);

  if (!company?.description && stats.length === 0) return null;
  return (
    <Section
      title={m.workspace.about.title}
      aside={
        company?.homepage && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => void openUrl(company.homepage!)}
          >
            {m.workspace.about.investorSite} <ArrowUpRight />
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
