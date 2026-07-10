// Capacitor mobile build. Produces a fully static SPA in dist/ that
// Capacitor packages as the iOS/Android web asset bundle.
//
// This is the FULL Kyte application — same routes and providers as the
// TanStack Start preview, mounted via src/main.mobile.tsx in CSR mode
// (no SSR, no server functions).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
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
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    modulePreload: { polyfill: false },
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
});
