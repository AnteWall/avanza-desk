import { getSetting, saveSetting } from "./settings";

// Your own groups of holdings, across accounts. Members are holding keys (`Holding.key`: the
// orderbook id, else ISIN or name), so a group survives moving a stock between accounts.
export type Group = { id: string; name: string; keys: string[] };

const KEY = "groups";
const listeners = new Set<() => void>();

// One shared fallback: `useSyncExternalStore` needs the same snapshot until something changes.
const none: Group[] = [];
export const getGroups = () => getSetting<Group[]>(KEY, none);

const emit = () => {
  for (const l of listeners) l();
};

function save(groups: Group[]) {
  void saveSetting(KEY, groups);
  emit();
}

// The group the portfolio page is narrowed to; `null` = everything.
const SELECTED = "holdings-group";
export const getGroupId = () => getSetting<string | null>(SELECTED, null);

export function setGroupId(id: string | null) {
  void saveSetting(SELECTED, id);
  emit();
}

/** Whether any of an instrument's ids (holding key, orderbook id, ISIN) is in the group. */
export const inGroup = (group: Group, ...ids: (string | null | undefined)[]) =>
  ids.some((id) => id != null && group.keys.includes(id));

export function subscribeGroups(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function createGroup(name: string, keys: string[]) {
  const id = crypto.randomUUID();
  save([...getGroups(), { id, name, keys: [...new Set(keys)] }]);
  return id;
}

export const updateGroup = (id: string, change: (g: Group) => Group) =>
  save(getGroups().map((g) => (g.id === id ? change(g) : g)));

export function deleteGroup(id: string) {
  if (getGroupId() === id) setGroupId(null);
  save(getGroups().filter((g) => g.id !== id));
}
