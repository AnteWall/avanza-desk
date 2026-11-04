import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountsQuery } from "@/lib/avanza/queries";
import { formatInteger } from "@/lib/format";

/** A wallet button that fills an amount with an account's buying power without credit (or all of them). */
export function BuyingPowerMenu({ onPick }: { onPick: (sek: number) => void }) {
  const { data: accounts = [] } = useQuery(accountsQuery);
  const withCash = accounts
    .map((a) => ({
      id: a.info.id,
      name: a.info.name,
      sek: a.buyingPower.totalExcludingCredit.value,
    }))
    .filter((a) => a.sek >= 1)
    .sort((a, b) => b.sek - a.sek);
  const total = withCash.reduce((s, a) => s + a.sek, 0);
  // Whole kronor, rounded down: never more than you can spend.
  const pick = (sek: number) => onPick(Math.floor(sek));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="shrink-0"
            aria-label="Use buying power"
            title="Use an account's buying power"
          />
        }
      >
        <Wallet />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Use buying power</DropdownMenuLabel>
          {withCash.length === 0 && (
            <DropdownMenuItem disabled>No account has buying power</DropdownMenuItem>
          )}
          {withCash.map((a) => (
            <DropdownMenuItem key={a.id} onClick={() => pick(a.sek)}>
              <span className="truncate">{a.name}</span>
              <span className="sensitive num text-muted-foreground ml-auto">
                {formatInteger(a.sek)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {withCash.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => pick(total)}>
              All accounts
              <span className="sensitive num text-muted-foreground ml-auto">
                {formatInteger(total)}
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
