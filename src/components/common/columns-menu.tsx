import { Columns3 } from "lucide-react";

import { useColumnPicks } from "@/components/common/use-column-picks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnPicks } from "@/lib/column-picks";
import { m } from "@/lib/i18n";

/** A table's optional columns, ticked on and off from a small menu in its panel's actions. */
export function ColumnsMenu<C extends string>({ picks }: { picks: ColumnPicks<C> }) {
  const shown = useColumnPicks(picks);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={m.common.columns}
            title={m.common.columns}
          />
        }
      >
        <Columns3 />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {m.common.columns}
          </DropdownMenuLabel>
          {(Object.keys(picks.labels) as C[]).map((c) => (
            <DropdownMenuCheckboxItem
              key={c}
              checked={shown.includes(c)}
              onCheckedChange={() => picks.toggle(c)}
            >
              {picks.labels[c]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
