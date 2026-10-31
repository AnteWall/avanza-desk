import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConnectedProviders } from "@/components/ai/use-connected-providers";
import type { Provider } from "@/lib/ai/types";

const key = (provider: Provider) => ["ai", provider.id, "setup"];

/**
 * Whether the provider is installed and signed in. Only checks a connected provider; until it is
 * ready, checks again every few seconds and on window focus, so installing or signing in from a
 * terminal shows up on its own.
 */
export const providerSetupQuery = (provider: Provider, connected: boolean) =>
  queryOptions({
    queryKey: key(provider),
    queryFn: provider.probe,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // The probe sends no message, so it costs no usage.
    refetchInterval: (q) => (q.state.data?.state === "ready" ? false : 5_000),
    enabled: connected,
    retry: false,
  });

export function useProviderSetup(provider: Provider) {
  const queryClient = useQueryClient();
  const connected = useConnectedProviders().includes(provider);
  const query = useQuery(providerSetupQuery(provider, connected));
  return {
    ...query,
    /** Picks another binary (null: auto-detect) and checks it. */
    async setBinary(path: string | null) {
      await provider.setBinary(path);
      await queryClient.invalidateQueries({ queryKey: key(provider) });
    },
  };
}
