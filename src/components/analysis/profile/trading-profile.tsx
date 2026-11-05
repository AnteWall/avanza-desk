import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FindingDetail } from "@/components/analysis/profile/finding-detail";
import { FindingItem } from "@/components/analysis/profile/finding-item";
import { StatList } from "@/components/analysis/stat-list";
import { Empty } from "@/components/common/empty";
import { SignedAmount } from "@/components/common/signed-amount";
import { Section } from "@/components/workspace/dossier/section";
import { accountIds } from "@/lib/account";
import { TransactionSide } from "@/lib/avanza/codes";
import { transactionFilterQuery } from "@/lib/avanza/queries";
import { formatInteger, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";
import { stockholmDay } from "@/lib/snapshots";
import { PROFILE_YEARS, profileTrades } from "@/lib/trading-profile";

/** Summary of your closed trades, every habit check, and why and on what the picked one decided. */
export function TradingProfile() {
  // shortcut: five years back; Avanza's real history limit is unknown, widen if it allows more.
  // Fixed at mount so the query key doesn't change at midnight.
  const [from] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - PROFILE_YEARS);
    return d.toISOString().slice(0, 10);
  });
  const { data } = useSuspenseQuery(
    transactionFilterQuery({
      from,
      accountIds: accountIds(),
      transactionTypes: [TransactionSide.Buy, TransactionSide.Sell],
    }),
  );
  const profile = useMemo(() => profileTrades(data.transactions, stockholmDay()), [data]);
  const [picked, setPicked] = useState<string>();
  const selected = profile.findings.find((f) => f.id === picked) ?? profile.findings[0];
  const found = profile.findings.filter((f) => f.status === "found").length;

  if (profile.trades === 0) return <Empty>{m.analysis.profile.empty}</Empty>;
  return (
    <div className="flex h-full flex-col">
      <Section
        title={m.analysis.profile.yourTrades}
        aside={m.analysis.profile.lastYears(PROFILE_YEARS)}
      >
        <StatList
          stats={[
            { label: m.analysis.profile.trades, value: formatInteger(profile.trades) },
            {
              label: m.analysis.profile.closed,
              value: formatInteger(profile.closed),
              note: m.analysis.profile.fifo,
            },
            {
              label: m.analysis.profile.winRate,
              value: profile.winRate == null ? "–" : formatShare(profile.winRate),
            },
            {
              label: m.analysis.profile.realized,
              value: <SignedAmount value={profile.realized} />,
              note: m.analysis.profile.realizedNote,
              sensitive: true,
            },
          ]}
        />
      </Section>
      {/* List and detail side by side, each scrolling on its own; stacked when narrow. */}
      <div className="grid border-t @4xl:min-h-0 @4xl:flex-1 @4xl:grid-cols-[22rem_1fr]">
        <nav
          aria-label={m.analysis.profile.patterns}
          className="border-b @4xl:min-h-0 @4xl:overflow-auto @4xl:border-r @4xl:border-b-0"
        >
          <Section
            title={m.analysis.profile.patterns}
            aside={m.analysis.profile.flagged(found, profile.findings.length)}
            flush
          >
            <ul className="divide-border/60 divide-y">
              {profile.findings.map((f) => (
                <li key={f.id}>
                  <FindingItem
                    finding={f}
                    selected={f === selected}
                    onSelect={() => setPicked(f.id)}
                  />
                </li>
              ))}
            </ul>
          </Section>
        </nav>
        <div className="@4xl:min-h-0 @4xl:overflow-auto">
          {selected && <FindingDetail key={selected.id} finding={selected} />}
        </div>
      </div>
    </div>
  );
}
