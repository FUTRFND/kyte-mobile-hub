// Capacitor mobile build. Produces a fully static SPA in dist/ that
// Capacitor packages as the iOS/Android web asset bundle.
//
// This is the FULL Kyte application — same routes and providers as the
// TanStack Start preview, mounted via src/main.mobile.tsx in CSR mode
// (no SSR, no server functions).
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // The Vite root is mobile/, but the .env with the Supabase values lives at the
  // repository root, so envDir must point back there. Without this the packaged
  // bundle ships with no VITE_SUPABASE_* values and the app dies at launch with
  // "Missing Supabase environment variable(s)".
  const env = loadEnv(mode, path.resolve(__dirname), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Mobile build aborted: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be present in the repository-root .env before running build:mobile.",
    );
  }

  return {
  root: path.resolve(__dirname, "mobile"),
  envDir: path.resolve(__dirname),
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, "src/routes"),
      generatedRouteTree: path.resolve(__dirname, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  define: {
    "import.meta.env.VITE_KYTE_MOBILE": JSON.stringify("1"),
    // Explicit fallbacks so the packaged bundle always carries the backend
    // values even if envDir resolution changes on another machine.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    modulePreload: { polyfill: false },
    sourcemap: false,
  },
  };
});
