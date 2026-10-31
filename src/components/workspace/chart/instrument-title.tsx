import type { ReactNode } from "react";

import { CountryFlag } from "@/components/common/country-flag";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import type { Instrument } from "@/lib/avanza/instrument";

/** Logo, name, listing line, and the price row passed as children. */
export function InstrumentTitle({
  instrument,
  children,
}: {
  instrument: Instrument;
  children: ReactNode;
}) {
  const listing = [instrument.name, instrument.marketPlaceName, instrument.currency]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-center gap-3">
      <InstrumentLogo
        isin={instrument.isin}
        name={instrument.name}
        className="size-11 rounded-lg"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{instrument.shortName}</span>
          <CountryFlag code={instrument.countryCode} />
          <span className="text-muted-foreground truncate">{listing}</span>
        </div>
        <div className="mt-1 flex items-center gap-3">{children}</div>
      </div>
    </div>
  );
}
