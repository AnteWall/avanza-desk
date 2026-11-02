import { cn } from "cn";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

/** A right-aligned number field with its unit ("SEK", "%") inside, after the value. */
export function UnitInput({
  unit,
  className,
  ...props
}: ComponentProps<typeof Input> & { unit: string }) {
  return (
    <span className="relative block">
      <Input
        className={cn("num h-7 text-right", unit.length > 1 ? "pr-10" : "pr-6", className)}
        {...props}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs">
        {unit}
      </span>
    </span>
  );
}
