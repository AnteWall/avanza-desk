import { getSetting, saveSetting } from "./settings";

// The account the portfolio views are scoped to; `null` = all accounts. Account-scoped queries
// read it in their queryFn (not their key), so changing it must reset them: see `setAccount`.
const KEY = "account";
const listeners = new Set<() => void>();

export const getAccount = () => getSetting<string | null>(KEY, null);

/** As `accountIds`-style filters want it: omitted means all accounts. */
export const accountIds = () => {
  const id = getAccount();
  return id ? [id] : undefined;
};

export function setAccount(id: string | null) {
  void saveSetting(KEY, id);
  for (const l of listeners) l();
}

export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** First query-key segments whose data depends on the selected account. */
export const accountScopedKeys = new Set(["positions", "portfolio", "transactions", "orders"]);
