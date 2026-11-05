import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RuleScope, RuleTarget } from "@/lib/alert-rules";
import { InstrumentType } from "@/lib/avanza/codes";
import { aggregateHoldings } from "@/lib/avanza/portfolio";
import { allPositionsQuery, universeQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";

type Option = RuleTarget & { isin?: string };

const ALL = "";

/**
 * What a rule applies to: everything in its scope, or one instrument. Holding rules list your
 * holdings; stock rules list held and watched stocks, plus whatever the rule was opened on.
 */
export function RuleTargetPicker({
  scope,
  allLabel,
  value,
  onChange,
}: {
  scope: Exclude<RuleScope, "accounts">;
  allLabel: string;
  value?: RuleTarget;
  onChange: (target: RuleTarget | undefined) => void;
}) {
  const { data: positions } = useQuery(allPositionsQuery);
  const { data: universe = [] } = useQuery({ ...universeQuery, enabled: scope === "stocks" });

  const groups: { label: string; options: Option[] }[] =
    scope === "holdings"
      ? [
          {
            label: m.alerts.targets.yourHoldings,
            options: positions
              ? aggregateHoldings(positions).map((h) => ({
                  id: h.orderbookId ?? h.key,
                  name: h.name,
                  type: h.type,
                  isin: h.isin,
                }))
              : [],
          },
        ]
      : [true, false].map((held) => ({
          label: held ? m.alerts.targets.held : m.alerts.targets.watched,
          options: universe
            .filter((s) => !!s.held === held)
            .map((s) => ({
              id: s.orderbookId,
              name: s.name,
              type: InstrumentType.Stock,
              isin: s.isin,
            })),
        }));
  const options = groups.flatMap((g) => g.options);
  // Opened on something not in the lists (a stock found by search): offer it on its own.
  const extra: Option | undefined =
    value && !options.some((o) => o.id === value.id) ? value : undefined;
  const byId = new Map([...options, ...(extra ? [extra] : [])].map((o) => [o.id, o]));
  const selected = value ? byId.get(value.id) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="w-full justify-between font-normal" />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selected && <InstrumentLogo isin={selected.isin} name={selected.name} />}
          <span className="truncate">{selected?.name ?? allLabel}</span>
        </span>
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72">
        <DropdownMenuRadioGroup
          value={value?.id ?? ALL}
          onValueChange={(id: string) => {
            const o = byId.get(id);
            onChange(o && { id: o.id, name: o.name, type: o.type });
          }}
        >
          <DropdownMenuRadioItem value={ALL}>{allLabel}</DropdownMenuRadioItem>
          {extra && <DropdownMenuRadioItem value={extra.id}>{extra.name}</DropdownMenuRadioItem>}
          {groups
            .filter((g) => g.options.length)
            .map((g) => (
              <DropdownMenuGroup key={g.label}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {g.label}
                </DropdownMenuLabel>
                {g.options.map((o) => (
                  <DropdownMenuRadioItem key={o.id} value={o.id}>
                    <InstrumentLogo isin={o.isin} name={o.name} />
                    <span className="truncate">{o.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
