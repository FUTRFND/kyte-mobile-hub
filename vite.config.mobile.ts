// Capacitor / SPA build. Run with: `vite build --config vite.config.mobile.ts`
// Emits dist/index.html + dist/assets/ suitable for `npx cap sync`.
// The default vite.config.ts (TanStack Start + Lovable preview) is left untouched.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  // Relative base so assets resolve under Capacitor's `capacitor://` / `file://` origin.
  base: "./",
  plugins: [
    tanstackRouter({
      target: "react",
      // Native iOS WKWebView has been failing before React mounts. Keep the
      // mobile app as one JS bundle so startup does not depend on runtime
      // dynamic route chunks resolving under the Capacitor app scheme.
      autoCodeSplitting: false,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/kyte-mobile.js",
        assetFileNames: "assets/kyte-mobile.[ext]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
