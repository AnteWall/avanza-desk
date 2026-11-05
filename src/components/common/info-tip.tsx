import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { m } from "@/lib/i18n";

/**
 * A small ⓘ next to a label: hover (or click, or focus and Enter) shows what the thing is and
 * what to type. `label` names it for screen readers ("About tolerance").
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label={m.common.infoTip(label)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded-full align-middle transition-colors outline-none focus-visible:ring-2"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 gap-1 p-2.5 text-xs leading-relaxed font-normal">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** A table column header with an ⓘ: `header: infoHeader("Drift", "How far…")`. */
export const infoHeader = (title: string, tip: ReactNode) => () => (
  <span className="inline-flex items-center gap-1">
    {title}
    <InfoTip label={title.toLowerCase()}>{tip}</InfoTip>
  </span>
);
