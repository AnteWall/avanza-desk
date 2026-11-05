import { MessageSquareText, Sparkles } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { useAssistantEnabled } from "@/components/ai/use-assistant-enabled";
import { RuleMenuItems } from "@/components/alerts/rule-menu-items";
import { BasketMenuItem } from "@/components/basket/basket-menu-item";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { askAssistant } from "@/lib/ai/ask";
import type { ContextItem } from "@/lib/ai/context";
import { m } from "@/lib/i18n";

/** Ready-made questions per kind of item; each one sends right away. */
function presets(item: ContextItem): string[] {
  if (item.kind === "instrument") {
    return [m.ai.ask.whyMoved(item.name), m.ai.ask.news(item.name), m.ai.ask.valued(item.name)];
  }
  if (item.kind === "article") {
    return m.ai.ask.article;
  }
  return [];
}

const label = (item: ContextItem) =>
  item.kind === "instrument"
    ? item.name
    : item.kind === "article"
      ? m.ai.ask.thisArticle
      : item.label;

/**
 * Right-click menu on `trigger` (a table body, a header): "Ask the assistant" with the item as
 * context (once the assistant is on), and for instruments "Add to basket" and "Alert me" rules. `item` is read when
 * the menu opens; undefined, or nothing to offer, shows no menu.
 */
export function AskMenu({
  item,
  trigger,
  extra,
}: {
  item: ContextItem | undefined;
  trigger: ReactElement<Record<string, unknown>>;
  /** More items for the menu (a table's actions on its selected rows), shown first. */
  extra?: ReactNode;
}) {
  const ask = useAssistantEnabled();
  const forItem = item && (ask || item.kind === "instrument");
  return (
    <ContextMenu>
      <ContextMenuTrigger render={trigger} className="select-auto" />
      {(forItem || extra) && (
        <ContextMenuContent className="w-64">
          {extra}
          {extra && forItem && <ContextMenuSeparator />}
          {forItem && item.kind === "instrument" && (
            <>
              <BasketMenuItem item={item} />
              {ask && <ContextMenuSeparator />}
            </>
          )}
          {forItem && ask && (
            <>
              <ContextMenuGroup>
                <ContextMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3" aria-hidden />
                  {m.ai.ask.title}
                </ContextMenuLabel>
                <ContextMenuItem onClick={() => askAssistant({ items: [item] })}>
                  <MessageSquareText />
                  <span className="truncate">{m.ai.ask.about(label(item))}</span>
                </ContextMenuItem>
              </ContextMenuGroup>
              {presets(item).length > 0 && <ContextMenuSeparator />}
              {presets(item).map((prompt) => (
                <ContextMenuItem
                  key={prompt}
                  onClick={() => askAssistant({ items: [item], prompt, send: true })}
                >
                  <span className="truncate">{prompt}</span>
                </ContextMenuItem>
              ))}
            </>
          )}
          {forItem && item.kind === "instrument" && (
            <>
              <ContextMenuSeparator />
              <RuleMenuItems item={item} />
            </>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
