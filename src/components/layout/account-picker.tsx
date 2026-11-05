import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Wallet } from "lucide-react";

import { useAccount } from "@/components/layout/use-account";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountScopedKeys, setAccount } from "@/lib/account";
import { accountsQuery } from "@/lib/avanza/queries";
import { formatInteger } from "@/lib/format";
import { m } from "@/lib/i18n";

const all = "all";

/** Scopes positions, portfolio, orders and transactions to one account, or all of them. */
export function AccountPicker() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery(accountsQuery);
  const account = useAccount();

  const pick = (value: string) => {
    setAccount(value === all ? null : value);
    // Scoped queries read the account in their queryFn: drop what was fetched for the old one.
    void queryClient.resetQueries({
      predicate: (q) => accountScopedKeys.has(String(q.queryKey[0])),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
      >
        <Wallet />
        <span className="text-foreground max-w-40 truncate">{account.label}</span>
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup value={account.id ?? all} onValueChange={pick}>
          <DropdownMenuRadioItem value={all}>{m.layout.accounts.all}</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {[...accounts]
            .sort((a, b) => b.totalValue.totalValue.value - a.totalValue.totalValue.value)
            .map((a) => (
              <DropdownMenuRadioItem key={a.info.id} value={a.info.id}>
                <span className="flex-1 truncate">{a.info.name}</span>
                <span className="num sensitive text-muted-foreground text-xs">
                  {formatInteger(a.totalValue.totalValue.value)}
                </span>
              </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
