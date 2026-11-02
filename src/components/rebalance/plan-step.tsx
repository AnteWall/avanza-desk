import type { ReactNode } from "react";

/**
 * One numbered step of the plan: a title with a line on what to do, actions on the right, and
 * its content (a table goes edge to edge, a footer can follow it).
 */
export function PlanStep({
  step,
  title,
  description,
  actions,
  children,
  footer,
}: {
  step: number;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="bg-card rounded-md border">
      <header className="flex items-start gap-3 p-3">
        <span className="num bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
          {step}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div className="border-t">{children}</div>
      {footer && (
        <footer className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 border-t p-3 text-xs">
          {footer}
        </footer>
      )}
    </section>
  );
}
