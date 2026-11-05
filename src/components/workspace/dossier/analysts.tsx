import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Section } from "@/components/workspace/dossier/section";
import { fundamentalsQuery, quoteQuery } from "@/lib/avanza/queries";
import { formatDate, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

/** Where the analysts stand: the buy/hold/sell split and the price-target range against the price. */
export function Analysts({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(fundamentalsQuery(orderbookId));
  const { data: quote } = useQuery(quoteQuery(orderbookId));
  const rec = data.recommendations;
  const targets = data.targets?.numberOfEstimates ? data.targets : null;
  if (!rec && !targets) return null;

  const split = rec && [
    {
      label: m.workspace.analysts.buy,
      n: rec.numberOfBuy + rec.numberOfOutperform,
      className: "bg-buy",
    },
    { label: m.workspace.analysts.hold, n: rec.numberOfHold, className: "bg-muted-foreground/40" },
    {
      label: m.workspace.analysts.sell,
      n: rec.numberOfSell + rec.numberOfUnderperform,
      className: "bg-sell",
    },
  ];
  const total = split?.reduce((sum, s) => sum + s.n, 0) ?? 0;

  return (
    <Section
      title={m.workspace.analysts.title}
      aside={rec && m.workspace.dossier.asOf(formatDate(rec.date))}
    >
      <div className="flex flex-col gap-5">
        {split && total > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm">
              {split.map((s) =>
                s.n ? (
                  <div key={s.label} className={s.className} style={{ flexGrow: s.n }} />
                ) : null,
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {split.map((s) => `${s.n} ${s.label}`).join(" · ")}
            </p>
          </div>
        )}
        {targets && <TargetRange {...targets} last={quote?.last ?? null} />}
      </div>
    </Section>
  );
}

/** Low, average and high price target on one line, with today's price marked. */
function TargetRange({
  lowPriceTarget: low,
  averagePriceTarget: avg,
  highPriceTarget: high,
  numberOfEstimates,
  last,
}: {
  lowPriceTarget: number;
  averagePriceTarget: number;
  highPriceTarget: number;
  numberOfEstimates: number;
  last: number | null;
}) {
  const min = Math.min(low, last ?? low);
  const max = Math.max(high, last ?? high);
  const at = (v: number) => `${max > min ? ((v - min) / (max - min)) * 100 : 50}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-xs">
        {m.workspace.analysts.targetFrom(numberOfEstimates)}
      </p>
      <div className="relative mx-1 h-4">
        <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
        <div
          className="bg-muted-foreground/40 absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ left: at(low), right: `calc(100% - ${at(high)})` }}
        />
        <div
          className="bg-foreground absolute top-0.5 h-3 w-0.5 -translate-x-1/2"
          style={{ left: at(avg) }}
          title={m.workspace.analysts.averageTarget(formatPrice(avg))}
        />
        {last != null && (
          <div
            className="bg-brand border-card absolute top-1/2 size-2.5 -translate-1/2 rounded-full border-2"
            style={{ left: at(last) }}
            title={m.workspace.analysts.lastPrice(formatPrice(last))}
          />
        )}
      </div>
      <dl className="num flex justify-between text-xs">
        <div>
          <dt className="text-muted-foreground">{m.workspace.analysts.low}</dt>
          <dd>{formatPrice(low)}</dd>
        </div>
        <div className="text-center">
          <dt className="text-muted-foreground">{m.workspace.analysts.average}</dt>
          <dd className="font-medium">{formatPrice(avg)}</dd>
        </div>
        {last != null && (
          <div className="text-center">
            <dt className="text-brand">{m.workspace.analysts.priceNow}</dt>
            <dd>{formatPrice(last)}</dd>
          </div>
        )}
        <div className="text-right">
          <dt className="text-muted-foreground">{m.workspace.analysts.high}</dt>
          <dd>{formatPrice(high)}</dd>
        </div>
      </dl>
    </div>
  );
}
