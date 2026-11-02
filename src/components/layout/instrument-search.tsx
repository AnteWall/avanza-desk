import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { SearchHit } from "avanza-ts";
import { cn } from "cn";
import { Bell, Search, SearchX } from "lucide-react";
import { useState } from "react";

import { LoadError } from "@/components/common/load-error";
import { pages } from "@/components/layout/pages";
import { SearchResult } from "@/components/layout/search-result";
import { useShortcut, useShortcutBindings } from "@/components/layout/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { searchQuery } from "@/lib/avanza/queries";
import { openRuleDialog } from "@/lib/rule-dialog";
import { bindingKeys, getBinding } from "@/lib/shortcuts";
import { useDebounced } from "@/lib/use-debounced";

// Things to do, matched like page names: any word of the label starting with what is typed.
const actions = [{ icon: Bell, label: "New alert rule", run: () => openRuleDialog() }];

/**
 * Top bar search button and the Ctrl K palette: type, arrow to a hit, Enter focuses it. Page
 * names and actions ("New alert rule") match too, listed first, so the palette also navigates.
 */
export function InstrumentSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const focus = useFocusInstrument();
  const navigate = useNavigate();
  // Debounced: each hit also fetches its stock (for the logo), so don't search per keystroke.
  const debounced = useDebounced(query, 200);
  const {
    data: hits = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...searchQuery(debounced),
    placeholderData: (previous) => previous,
  });

  useShortcut("search", () => setOpen(true));
  useShortcutBindings();

  const typed = query.trim().toLowerCase();
  const commands = typed
    ? [
        ...pages
          .filter((p) => p.label.toLowerCase().startsWith(typed))
          .map((p) => ({
            key: p.to,
            icon: p.icon,
            label: `Go to ${p.label}`,
            hint: bindingKeys(getBinding(`page:${p.to}`)).join(" ") || undefined,
            run: () => void navigate({ to: p.to }),
          })),
        ...actions
          .filter((a) =>
            a.label
              .toLowerCase()
              .split(" ")
              .some((w) => w.startsWith(typed)),
          )
          .map((a) => ({ ...a, key: a.label, hint: undefined })),
      ]
    : [];
  const count = commands.length + hits.length;

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (hit: SearchHit | undefined) => {
    if (!hit?.orderBookId) return;
    focus(hit.orderBookId, hit.type);
    close();
  };
  const pickAt = (i: number) => {
    const command = commands[i];
    if (!command) return pick(hits[i - commands.length]);
    close();
    command.run();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground w-full max-w-72 justify-start"
        onClick={() => setOpen(true)}
      >
        <Search />
        Search instruments…
        <kbd className="num ml-auto text-xs">{bindingKeys(getBinding("search")).join(" ")}</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-24 translate-y-0 gap-2 p-2 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Search instruments</DialogTitle>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Search stocks, funds, ETFs…"
              value={query}
              className="h-9 pl-8"
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, count - 1));
                else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
                else if (e.key === "Enter") pickAt(active);
                else return;
                e.preventDefault();
              }}
            />
          </div>
          {query && count > 0 && (
            <ul
              role="listbox"
              aria-label="Results"
              className="flex max-h-96 flex-col overflow-auto"
            >
              {commands.map((command, i) => (
                <li
                  key={command.key}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pickAt(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5",
                    i === active && "bg-accent",
                  )}
                >
                  <command.icon className="text-muted-foreground size-4" />
                  {command.label}
                  {command.hint && (
                    <kbd className="num text-muted-foreground ml-auto text-xs">{command.hint}</kbd>
                  )}
                </li>
              ))}
              {hits.map((hit, j) => {
                const i = commands.length + j;
                return (
                  <li
                    key={hit.orderBookId}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(hit)}
                    className="cursor-pointer"
                  >
                    <SearchResult hit={hit} active={i === active} />
                  </li>
                );
              })}
            </ul>
          )}
          {error && !isFetching && (
            <LoadError what="search results" error={error} onRetry={() => void refetch()} />
          )}
          {query && debounced === query && !isFetching && !error && count === 0 && (
            <p className="text-muted-foreground flex items-center gap-2 px-2 py-3">
              <SearchX className="size-4" />
              Nothing matches “{query}”.
            </p>
          )}
          <p className="text-muted-foreground flex gap-3 border-t px-2 pt-2 text-xs">
            <span>
              <kbd className="num">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="num">Enter</kbd> open
            </span>
            <span>
              <kbd className="num">Esc</kbd> close
            </span>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
