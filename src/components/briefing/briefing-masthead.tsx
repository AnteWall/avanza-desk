import { cn } from "cn";
import { useState } from "react";

import { BriefingChart } from "@/components/briefing/briefing-chart";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Change } from "@/components/common/change";
import { SignedAmount } from "@/components/common/signed-amount";
import { Skeleton } from "@/components/common/skeleton";
import type { Briefing } from "@/lib/briefing";
import { visitDay } from "@/lib/briefing";
import { formatDate, formatInteger, formatPrice, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";
import { stockholmToday } from "@/lib/news";

const DAY = 86_400_000;

/**
 * The front page: how long you were away, a one-line headline of how it went, a paragraph on
 * what stood out, the key figures and the return over the period.
 */
export function BriefingMasthead({ b, today }: { b: Briefing; today: boolean }) {
  const [now] = useState(Date.now);
  const days = Math.max(1, Math.round((now - Date.parse(b.since)) / DAY));
  const flat = Math.abs(b.ratio) < 0.001;
  const up = b.result > 0;
  const best = b.movers.find((x) => x.ratio > 0);
  const worst = b.movers.find((x) => x.ratio < 0);
  const events = new Set(b.upcoming.map((e) => e.orderbookId)).size;

  const t = m.briefing.masthead;
  const count = (...kinds: string[]) => b.activity.filter((a) => kinds.includes(a.kind)).length;
  const [trades, dividends, alerts] = [count("buy", "sell"), count("dividend"), count("alert")];
  const facts = [
    trades > 0 && t.trades(trades),
    dividends > 0 && t.dividends(dividends),
    alerts > 0 && t.alerts(alerts),
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-5">
      <p className="text-xs font-semibold tracking-wider uppercase">
        <span className="text-brand">{today ? m.common.today : t.sinceLastVisit}</span>
        <span className="text-muted-foreground">
          {" "}
          · {today ? visitDay(b.since) : t.away(days, visitDay(b.since))}
        </span>
      </p>
      <h1 className="text-3xl leading-tight font-semibold text-balance">
        {flat
          ? today
            ? t.flatToday
            : t.flatSince
          : t.moved(
              up,
              <span key="amount" className={cn("num sensitive", up ? "text-up" : "text-down")}>
                {formatInteger(Math.abs(b.result))} SEK
              </span>,
              today,
              visitDay(b.since),
            )}
      </h1>
      <p className="text-muted-foreground max-w-[62ch] text-base leading-relaxed">
        {best &&
          t.led(
            <span key="name" className="text-foreground font-medium">
              {best.name}
            </span>,
            <span key="change" className="num">
              {formatShare(best.ratio)}
            </span>,
            !!worst,
          )}
        {worst &&
          t.fell(
            <span key="name" className="text-foreground font-medium">
              {worst.name}
            </span>,
            <span key="change" className="num">
              {formatShare(-worst.ratio)}
            </span>,
          )}
        {facts.length > 0 && t.meanwhile(facts.join(", "))}
        {events > 0 && t.upcoming(events)}
      </p>
      <dl className="grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">{t.valueNow}</dt>
          <dd className="num sensitive text-lg font-semibold">{formatPrice(b.total)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">{today ? m.common.today : t.result}</dt>
          <dd className="text-lg font-semibold">
            <SignedAmount value={b.result} className="sensitive" />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">{m.common.return}</dt>
          <dd className="text-lg font-semibold">
            <Change ratio={b.ratio} badge />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">
            {b.deposits < 0 ? t.withdrawn : t.deposited}
          </dt>
          <dd className="num sensitive text-lg font-semibold">
            {formatInteger(Math.abs(b.deposits))}
          </dd>
        </div>
      </dl>
      {today && <span className="text-muted-foreground -mb-3 text-xs">{t.returnThisYear}</span>}
      <AsyncBoundary what={t.yourReturn} fallback={<Skeleton className="h-40 w-full" />} compact>
        <BriefingChart
          from={today ? `${stockholmToday().slice(0, 4)}-01-01` : formatDate(b.since)}
          to={stockholmToday()}
        />
      </AsyncBoundary>
    </header>
  );
}
