import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";
import type { FileRoutesByTo } from "@/routeTree.gen";

/** A chapter of the briefing: a headline, a muted dek, and a way to the full page. */
export function BriefingSection({
  title,
  dek,
  to,
  children,
}: {
  title: string;
  dek?: string;
  to: keyof FileRoutesByTo;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3 border-b pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {dek && <span className="text-muted-foreground text-xs">{dek}</span>}
        <Button
          variant="outline"
          size="xs"
          className="ml-auto self-center"
          onClick={() => void navigate({ to })}
        >
          {m.briefing.viewAll}
        </Button>
      </div>
      {children}
    </section>
  );
}
