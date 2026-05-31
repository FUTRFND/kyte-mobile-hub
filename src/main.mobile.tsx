// Capacitor / SPA entry. Bootstraps the same file-based route tree as the
// TanStack Start preview, but mounted in CSR mode — no SSR, no server fns.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { supabase } from "./integrations/supabase/client";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Keep TanStack Query cache and route data in sync with Supabase auth state.
supabase.auth.onAuthStateChange(() => {
  router.invalidate();
  queryClient.invalidateQueries();
});

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
