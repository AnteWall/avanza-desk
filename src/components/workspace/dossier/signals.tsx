import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useMemo } from "react";

import { SignalTone } from "@/components/signals/signal-tone";
import { useSignals } from "@/components/signals/use-signals";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/workspace/dossier/section";
import type { Instrument } from "@/lib/avanza/instrument";
import { universeQuery } from "@/lib/avanza/queries";
import { formatDate } from "@/lib/format";
import { openRuleDialog } from "@/lib/rule-dialog";

/**
 * The stock's recent signals (the Signals page's feed, for this one stock) with a shortcut to
 * be alerted on new ones. Renders nothing while there are none.
 */
export function Signals({ instrument }: { instrument: Instrument }) {
  const id = instrument.orderbookId;
  const { data: universe } = useQuery(universeQuery);
  const known = universe?.find((s) => s.orderbookId === id);
  const stocks = useMemo(
    () => [
      known ?? {
        orderbookId: id,
        name: instrument.name,
        currency: "",
        held: false,
        watched: false,
        value: 0,
      },
    ],
    [known, id, instrument.name],
  );
  const { signals } = useSignals(stocks);
  if (signals.length === 0) return null;
  return (
    <Section
      title="Signals"
      aside={
        <Button
          variant="outline"
          size="xs"
          onClick={() =>
            openRuleDialog({ kind: "signal", target: { id, name: instrument.name, type: "STOCK" } })
          }
        >
          <Bell />
          Alert me on new ones
        </Button>
      }
    >
      <ul className="flex flex-col gap-1.5">
        {signals.map((s) => (
          <li key={`${s.kind}:${s.date}`} className="flex items-start gap-2">
            <SignalTone tone={s.tone} />
            <span className="min-w-0 flex-1">{s.text}</span>
            <span className="num text-muted-foreground text-xs">{formatDate(s.date)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
