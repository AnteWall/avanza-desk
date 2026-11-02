import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";

import { InstrumentType } from "@/lib/avanza/codes";
import { marketplaceQuery, watchlistsQuery } from "@/lib/avanza/queries";

export type Focus = { id: string; type?: string };

/** Focused instrument from `?ob=&type=`, falling back to the first watchlist's first instrument. */
export function useFocusedInstrument(): Focus | undefined {
  const { ob, type } = useSearch({ strict: false });
  const { data: watchlists } = useQuery(watchlistsQuery);
  const id = ob ?? watchlists?.[0]?.orderbookIds[0];
  return id ? { id, type: ob ? type : undefined } : undefined;
}

/** Focuses an instrument in the workspace; a pop-out window switches its own instrument. */
export function useFocusInstrument() {
  const navigate = useNavigate();
  const popout = useRouterState({ select: (s) => s.location.pathname === "/popout" });
  return (ob: string, type?: string) =>
    void navigate({ to: popout ? "/popout" : "/", search: { ob, type } });
}

/** True while the instrument's market is open: gates every live poll. Funds never are. */
export function useMarketOpen(focus: Focus | undefined) {
  const enabled = !!focus && focus.type !== InstrumentType.Fund;
  const { data } = useQuery({ ...marketplaceQuery(focus?.id ?? ""), enabled, retry: false });
  return data?.marketOpen ?? false;
}
