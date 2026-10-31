import type { ReactNode } from "react";

/** One dossier section: a quiet title line, then content; `flush` lets tables run edge to edge. */
export function Section({
  title,
  aside,
  flush,
  children,
}: {
  title: string;
  aside?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col">
      <header className="flex h-8 shrink-0 items-center gap-2 px-3">
        <h3 className="text-xs font-semibold tracking-wider uppercase">{title}</h3>
        {aside && <span className="text-muted-foreground truncate text-xs">{aside}</span>}
      </header>
      <div className={flush ? undefined : "px-3 pb-3"}>{children}</div>
    </section>
  );
}

/** Sections side by side when the panel is wide, stacked when narrow. */
export function SectionRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid divide-y border-t @4xl:grid-cols-2 @4xl:divide-x @4xl:divide-y-0">
      {children}
    </div>
  );
}
