import { cn } from "cn";
import { LayoutGrid, Newspaper, Wallet, X } from "lucide-react";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import { pages } from "@/components/layout/pages";
import type { ContextItem } from "@/lib/ai/context";
import { m } from "@/lib/i18n";

const label = (item: ContextItem) =>
  item.kind === "instrument" ? item.name : item.kind === "article" ? item.title : item.label;

function Icon({ item }: { item: ContextItem }) {
  if (item.kind === "instrument") {
    return <InstrumentLogo isin={item.isin} name={item.name} className="size-3.5" />;
  }
  const PageIcon =
    item.kind === "article"
      ? Newspaper
      : item.kind === "account"
        ? Wallet
        : (pages.find((p) => p.label === item.label)?.icon ?? LayoutGrid);
  return <PageIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />;
}

/**
 * One piece of what the assistant can see: in the message box (removable, for the next
 * message) and above a sent question (what it was asked with).
 */
export function ContextChip({
  item,
  onRemove,
  className,
}: {
  item: ContextItem;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted/50 text-foreground inline-flex h-6 max-w-56 items-center gap-1.5 rounded-md border border-dashed pr-1 pl-1.5 text-xs",
        !onRemove && "pr-1.5",
        className,
      )}
    >
      <Icon item={item} />
      <span className="truncate">{label(item)}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={m.ai.chip.dontSend(label(item))}
          title={m.ai.chip.dontSendTitle}
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 grid size-4 shrink-0 place-items-center rounded-sm transition-colors outline-none focus-visible:ring-2"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
