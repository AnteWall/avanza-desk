import { cn } from "cn";
import type { ReactNode } from "react";

import { InfoTip } from "@/components/common/info-tip";

/** A label over a value. Lives inside a `<dl>`. */
export function Kpi({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  /** A sentence on what the value means, behind an ⓘ. */
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col whitespace-nowrap">
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        {label}
        {hint && <InfoTip label={label.toLowerCase()}>{hint}</InfoTip>}
      </dt>
      <dd className={cn("num font-medium", className)}>{children}</dd>
    </div>
  );
}
