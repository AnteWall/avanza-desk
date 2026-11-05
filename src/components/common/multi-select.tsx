import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/lib/i18n";

export type MultiSelectOption = { value: string; label: string; hint?: ReactNode };

/** A dropdown of checkable options; stays open while you tick. `value` keeps `options` order. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = m.common.none,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const picked = options.filter((o) => value.includes(o.value));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="min-w-40 justify-between" />}
      >
        <span className="truncate">
          {picked.length ? picked.map((o) => o.label).join(", ") : placeholder}
        </span>
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value.includes(o.value)}
            onCheckedChange={(on) =>
              onChange(
                options
                  .filter((x) => (x.value === o.value ? on : value.includes(x.value)))
                  .map((x) => x.value),
              )
            }
          >
            <span>{o.label}</span>
            {o.hint && <span className="text-muted-foreground text-xs">{o.hint}</span>}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
