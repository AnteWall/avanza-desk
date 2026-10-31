import type { ReactNode } from "react";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b py-1.5 last:border-b-0">
      <h2 className="text-muted-foreground px-3 pt-1.5 pb-1 text-xs font-medium tracking-wider uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
