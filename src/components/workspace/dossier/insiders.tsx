import { useSuspenseQuery } from "@tanstack/react-query";

import { Section } from "@/components/workspace/dossier/section";
import { InsiderTradesTable } from "@/components/workspace/fundamentals/insider-trades-table";
import { fundamentalsQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";

const SHOWN = 6;

/** The latest reported insider trades; the 3-month net sits in the snapshot above. */
export function Insiders({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(fundamentalsQuery(orderbookId));
  const trades = [...(data.insiders?.transactions ?? [])]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, SHOWN);
  if (trades.length === 0) return null;
  return (
    <Section title={m.workspace.insiders.title} aside={m.workspace.insiders.latest} flush>
      <InsiderTradesTable trades={trades} />
    </Section>
  );
}
