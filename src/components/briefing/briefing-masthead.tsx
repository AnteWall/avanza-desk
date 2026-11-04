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
import { stockholmToday } from "@/lib/news";

const DAY = 86_400_000;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The front page: how long you were away, a one-line headline of how it went, a paragraph on
 * what stood out, the key figures and the return over the period.
 */
export function BriefingMasthead({ b, today }: { b: Briefing; today: boolean }) {
  const [now] = useState(Date.now);
  const days = Math.max(1, Math.round((now - Date.parse(b.since)) / DAY));
  const flat = Math.abs(b.ratio) < 0.001;
  const up = b.result > 0;
  const best = b.movers.find((m) => m.ratio > 0);
  const worst = b.movers.find((m) => m.ratio < 0);
  const events = new Set(b.upcoming.map((e) => e.orderbookId)).size;

  const count = (...kinds: string[]) => b.activity.filter((a) => kinds.includes(a.kind)).length;
  const [trades, dividends, alerts] = [count("buy", "sell"), count("dividend"), count("alert")];
  const facts = [
    trades > 0 && plural(trades, "trade"),
    dividends > 0 && plural(dividends, "dividend"),
    alerts > 0 && `${plural(alerts, "alert")} triggered`,
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-5">
      <p className="text-xs font-semibold tracking-wider uppercase">
        <span className="text-brand">{today ? "Today" : "Since last visit"}</span>
        <span className="text-muted-foreground">
          {" "}
          ·{" "}
          {today
            ? visitDay(b.since)
            : `${plural(days, "day")} away · ${visitDay(b.since)} to today`}
        </span>
      </p>
      <h1 className="text-3xl leading-tight font-semibold text-balance">
        {flat ? (
          today ? (
            "Your portfolio is about where it started the day."
          ) : (
            "Your portfolio is about where you left it."
          )
        ) : (
          <>
            You're {up ? "up" : "down"}{" "}
            <span className={cn("num sensitive", up ? "text-up" : "text-down")}>
              {formatInteger(Math.abs(b.result))} SEK
            </span>{" "}
            {today ? "today" : `since ${visitDay(b.since)}`}.
          </>
        )}
      </h1>
      <p className="text-muted-foreground max-w-[62ch] text-base leading-relaxed">
        {best && (
          <>
            <span className="text-foreground font-medium">{best.name}</span> led, up{" "}
            <span className="num">{formatShare(best.ratio)}</span>
            {worst ? ", while " : ". "}
          </>
        )}
        {worst && (
          <>
            <span className="text-foreground font-medium">{worst.name}</span> fell{" "}
            <span className="num">{formatShare(-worst.ratio)}</span>.{" "}
          </>
        )}
        {facts.length > 0 && <>Meanwhile: {facts.join(", ")}. </>}
        {events > 0 &&
          `${plural(events, "holding")} ${events === 1 ? "reports or goes" : "report or go"} ex-dividend in the next two weeks.`}
      </p>
      <dl className="grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">Value now</dt>
          <dd className="num sensitive text-lg font-semibold">{formatPrice(b.total)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">{today ? "Today" : "Result"}</dt>
          <dd className="text-lg font-semibold">
            <SignedAmount value={b.result} className="sensitive" />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">Return</dt>
          <dd className="text-lg font-semibold">
            <Change ratio={b.ratio} badge />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">
            {b.deposits < 0 ? "Withdrawn" : "Deposited"}
          </dt>
          <dd className="num sensitive text-lg font-semibold">
            {formatInteger(Math.abs(b.deposits))}
          </dd>
        </div>
      </dl>
      {today && <span className="text-muted-foreground -mb-3 text-xs">Your return this year</span>}
      <AsyncBoundary what="your return" fallback={<Skeleton className="h-40 w-full" />} compact>
        <BriefingChart
          from={today ? `${stockholmToday().slice(0, 4)}-01-01` : formatDate(b.since)}
          to={stockholmToday()}
        />
      </AsyncBoundary>
    </header>
  );
}
