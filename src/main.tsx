import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AvanzaHttpError } from "avanza-ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { isUnauthorized, signOut } from "./lib/avanza/client";
import { initDensity } from "./lib/density";
import { initPrivacy } from "./lib/privacy";
import { loadSettings } from "./lib/settings";
import { initTheme } from "./lib/theme";
import { initWindowFrame } from "./lib/window-frame";
import { routeTree } from "./routeTree.gen";

import "./index.css";

// Settings come from SQLite; read them before rendering so the theme never flashes.
await loadSettings();
initTheme();
initDensity();
initPrivacy();
initWindowFrame();

// Any 401 (expired or missing session) opens the sign-in overlay.
const onError = (error: unknown) => {
  if (isUnauthorized(error)) void signOut(queryClient);
};
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    // Client errors (no data, session expired) won't fix themselves; only retry 5xx/network.
    queries: {
      retry: (count, error) =>
        !(error instanceof AvanzaHttpError && error.status < 500) &&
        !isUnauthorized(error) &&
        count < 3,
    },
  },
});
const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
