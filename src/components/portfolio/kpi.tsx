import { cn } from "cn";
import type { ReactNode } from "react";

/** A label over a value. Lives inside a `<dl>`. */
export function Kpi({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  /** Tooltip explaining how the value is derived. */
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div title={hint} className="flex flex-col whitespace-nowrap">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("num font-medium", className)}>{children}</dd>
    </div>
  );
}
