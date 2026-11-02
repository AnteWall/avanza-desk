import type { ReactNode } from "react";

import { InfoTip } from "@/components/common/info-tip";

/**
 * A setting in a form row: a small label with its ⓘ on top, the control below. The label is
 * text only (the ⓘ is a button, so it can't sit in a <label>): give inputs their own aria-label.
 */
export function PlanField({
  label,
  tip,
  children,
}: {
  label: string;
  tip: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex h-4 items-center gap-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <InfoTip label={label.toLowerCase()}>{tip}</InfoTip>
      </div>
      {children}
    </div>
  );
}
