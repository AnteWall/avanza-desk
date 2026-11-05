import { cn } from "cn";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import type { ContextItem } from "@/lib/ai/context";
import { m } from "@/lib/i18n";

type Instrument = Extract<ContextItem, { kind: "instrument" }>;

/**
 * Suggestions for an "@" mention, above the message box. The composer owns the keyboard
 * (↑↓ to move, Enter or Tab to pick, Escape to close); this only draws the list.
 */
export function MentionList({
  options,
  active,
  onPick,
  query,
}: {
  options: Instrument[];
  active: number;
  onPick: (item: Instrument) => void;
  query: string;
}) {
  return (
    <div
      role="listbox"
      aria-label={m.ai.mention.label}
      className="bg-popover ring-foreground/10 absolute inset-x-0 bottom-full mb-1.5 flex flex-col gap-0.5 rounded-lg p-1 shadow-md ring-1"
    >
      <span className="text-muted-foreground px-2 pt-0.5 pb-1 text-xs">
        {query ? m.ai.mention.matching(query) : m.ai.mention.holdings}
      </span>
      {options.length === 0 && (
        <span className="text-muted-foreground px-2 py-1.5 text-xs">
          {query.length < 2 ? m.ai.mention.typeName : m.ai.mention.noMatches}
        </span>
      )}
      {options.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === active}
          // Keep focus in the text box while clicking.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(item)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
            i === active ? "bg-accent" : "hover:bg-muted/60",
          )}
        >
          <InstrumentLogo isin={item.isin} name={item.name} className="size-4" />
          <span className="truncate">{item.name}</span>
          {item.type && (
            <span className="text-muted-foreground ml-auto shrink-0 text-xs">
              {m.ai.mention.types[item.type] ?? item.type.toLowerCase().replace(/_/g, " ")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
