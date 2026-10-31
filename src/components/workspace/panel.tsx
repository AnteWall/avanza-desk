import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** The frame every workspace panel uses: title bar (title, subtitle, actions), scrolling body. */
export function Panel({
  title,
  icon: Icon,
  subtitle,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-card",
        className,
      )}
    >
      <header className="bg-muted/40 flex h-8 shrink-0 items-center gap-2 border-b px-3">
        {Icon && <Icon className="text-muted-foreground size-3.5" aria-hidden />}
        <h2 className="text-xs font-semibold tracking-wider uppercase">{title}</h2>
        {subtitle && <span className="text-muted-foreground text-xs">{subtitle}</span>}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
