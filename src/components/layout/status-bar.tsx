import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import githubLogoDark from "@/assets/github-dark.svg";
import githubLogo from "@/assets/github.svg";
import { ExchangeStrip } from "@/components/layout/exchange-strip";
import { useLastFetches } from "@/components/layout/use-connection";
import { useFocusedInstrument } from "@/components/workspace/use-focused-instrument";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery, marketplaceQuery, quoteQuery } from "@/lib/avanza/queries";
import { REPO_URL } from "@/lib/changelog";
import { connection } from "@/lib/connection";
import { formatDuration, formatTime } from "@/lib/format";

export function StatusBar() {
  // Status chrome, not a data panel: if these fail the indicators just stay hidden.
  const focus = useFocusedInstrument();
  const listed = !!focus && focus.type !== InstrumentType.Fund;
  const ob = focus?.id ?? "";
  // Each instrument's own exchange: Stockholm, Nasdaq US, Oslo… all keep their own hours.
  const { data: market, dataUpdatedAt } = useQuery({
    ...marketplaceQuery(ob),
    enabled: listed,
    retry: false,
  });
  const { data: instrument } = useQuery({
    ...instrumentQuery(ob, focus?.type),
    enabled: listed,
    retry: false,
  });
  // Shares the quote cache with the chart; never polls on its own.
  const { data: quote } = useQuery({ ...quoteQuery(ob), enabled: listed, retry: false });
  const { data: version } = useQuery({
    queryKey: ["app", "version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });
  const fetches = useLastFetches();
  const [now, setNow] = useState(() => new Date());
  const conn = connection(fetches.lastSuccess, fetches.lastError, now.getTime(), fetches.online);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="bg-card text-muted-foreground col-span-3 flex h-6 items-center gap-4 border-t px-3 text-xs">
      {market && (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "size-1.5 rounded-full",
              market.marketOpen ? "bg-brand" : "bg-muted-foreground",
            )}
          />
          {/* Avanza's status is exact (holidays too). Its opening time has no day, and its
              countdown while closed is not to the open, so only the closing side is shown. */}
          <span className="text-foreground">{instrument?.marketPlaceName ?? "Market"}</span>
          {market.marketOpen ? (
            <span className="num">
              open · closes {market.todayClosingTime.slice(0, 5)} · in{" "}
              {formatDuration(market.timeLeftMs - (now.getTime() - dataUpdatedAt))}
            </span>
          ) : (
            "closed"
          )}
        </span>
      )}
      <ExchangeStrip now={now} />
      <span className="num">{formatTime(now)}</span>
      {quote && (
        <span className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              quote.isRealTime ? "bg-brand" : "bg-muted-foreground",
            )}
          />
          {quote.isRealTime ? "Real-time" : "Delayed"}
        </span>
      )}
      <span className={cn("flex items-center gap-1.5", !quote && "ml-auto")}>
        <span
          className={cn(
            "size-1.5 rounded-full",
            conn.state === "live" && "bg-brand",
            conn.state === "stale" && "bg-warning",
            conn.state === "error" && "bg-destructive",
          )}
        />
        <span className={cn(conn.state === "error" && "text-destructive")}>{conn.label}</span>
      </span>
      {version && <span className="num">v{version}</span>}
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void openUrl(REPO_URL)}
          title="AvanzaDesk on GitHub"
          aria-label="AvanzaDesk on GitHub"
          className="group cursor-pointer"
        >
          <img
            src={githubLogo}
            alt=""
            aria-hidden
            className="size-3 opacity-60 group-hover:opacity-100 dark:hidden"
          />
          <img
            src={githubLogoDark}
            alt=""
            aria-hidden
            className="hidden size-3 opacity-60 group-hover:opacity-100 dark:block"
          />
        </button>
        <button
          type="button"
          onClick={() => void openUrl(`${REPO_URL}/stargazers`)}
          title="Star AvanzaDesk on GitHub"
          aria-label="Star AvanzaDesk on GitHub"
          className="hover:text-foreground cursor-pointer transition-colors"
        >
          <Star className="size-3" aria-hidden />
        </button>
      </span>
    </footer>
  );
}
