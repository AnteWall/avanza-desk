import { useSuspenseQuery } from "@tanstack/react-query";

import { StatList } from "@/components/workspace/chart/stat-list";
import { Section } from "@/components/workspace/dossier/section";
import { etfDetailsQuery } from "@/lib/avanza/queries";

/** What an ETF tracks and who issues it. */
export function EtfAbout({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(etfDetailsQuery(orderbookId));
  const stats = [
    { label: "Issuer", value: data.issuer },
    { label: "Category", value: [data.category, data.subCategory].filter(Boolean).join(" · ") },
  ].filter((s) => s.value);
  return (
    <Section title="About">
      <div className="flex flex-col gap-3">
        {data.description && <p className="max-w-prose leading-relaxed">{data.description}</p>}
        <StatList stats={stats.map((s) => ({ ...s, text: true }))} />
      </div>
    </Section>
  );
}
