import type { ReactNode } from "react";

/** Label and hint on the left; the control right-aligned, every row the same height. */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-6 px-3 py-1.5">
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </span>
      <span className="flex shrink-0 justify-end">{children}</span>
    </div>
  );
}
