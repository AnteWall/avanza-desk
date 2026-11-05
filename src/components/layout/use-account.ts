import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { getAccount, subscribeAccount } from "@/lib/account";
import { accountsQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";

/** The account the views are scoped to (`id` null = all accounts) and its display name. */
export function useAccount() {
  const id = useSyncExternalStore(subscribeAccount, getAccount);
  const { data: accounts } = useQuery(accountsQuery);
  const name = id
    ? (accounts?.find((a) => a.info.id === id)?.info.name ?? m.layout.accounts.one)
    : null;
  return { id, label: name ?? m.layout.accounts.all };
}
