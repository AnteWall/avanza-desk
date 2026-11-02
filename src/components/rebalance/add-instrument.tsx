import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SearchHit } from "avanza-ts";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchResult } from "@/components/layout/search-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { instrumentQuery, searchQuery } from "@/lib/avanza/queries";
import { isTyping } from "@/lib/keys";
import type { AddedInstrument } from "@/lib/rebalance";
import { useDebounced } from "@/lib/use-debounced";

/**
 * "Add instrument": search any stock, fund or ETF and add it to the plan with a 0 % target, so
 * you can give it a share and get the buy. Instruments already in the plan are left out.
 */
export function AddInstrument({
  inPlan,
  onAdd,
}: {
  inPlan: ReadonlySet<string>;
  onAdd: (instrument: AddedInstrument) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const queryClient = useQueryClient();
  // A opens it (the tab is only mounted while shown).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e) || e.key.toLowerCase() !== "a") return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const debounced = useDebounced(query, 200);
  const { data = [] } = useQuery({
    ...searchQuery(debounced),
    placeholderData: (previous) => previous,
  });
  const hits = query ? data.filter((h) => !inPlan.has(h.orderBookId!)) : [];

  const add = async (hit: SearchHit | undefined) => {
    if (!hit?.orderBookId) return;
    // ISIN (for the logo) and currency (for the SEK price); SearchResult has usually cached it.
    const info = await queryClient
      .fetchQuery(instrumentQuery(hit.orderBookId, hit.type))
      .catch(() => undefined);
    onAdd({
      orderbookId: hit.orderBookId,
      name: hit.title,
      type: hit.type,
      isin: info?.isin ?? undefined,
      currency: info?.currency ?? hit.price?.currency ?? "SEK",
    });
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="xs" title="Add instrument (A)" />}>
        <Plus />
        Add instrument
        <kbd className="num text-muted-foreground">A</kbd>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 gap-1 p-2">
        <Input
          autoFocus
          placeholder="Search stocks, funds, ETFs…"
          aria-label="Search instrument to add"
          value={query}
          className="h-8"
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, hits.length - 1));
            else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
            else if (e.key === "Enter") void add(hits[active]);
            else return;
            e.preventDefault();
          }}
        />
        {hits.length > 0 && (
          <ul role="listbox" aria-label="Results" className="flex max-h-80 flex-col overflow-auto">
            {hits.map((hit, i) => (
              <li
                key={hit.orderBookId}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => void add(hit)}
                className="cursor-pointer"
              >
                <SearchResult hit={hit} active={i === active} />
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
