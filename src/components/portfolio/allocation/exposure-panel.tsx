import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Panel } from "@/components/workspace/panel";

/** A titled panel for one look-through dimension; the body suspends on positions. */
export function ExposurePanel({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: LucideIcon;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Panel title={title} icon={icon} subtitle={subtitle}>
      <AsyncBoundary what={title.toLowerCase()} fallback={<TableSkeleton rows={8} columns={4} />}>
        {children}
      </AsyncBoundary>
    </Panel>
  );
}
