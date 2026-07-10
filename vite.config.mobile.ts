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
  // Root-relative assets keep the JS bundle loadable even if iOS restores a
  // previous in-app URL such as /app/home before the router takes over.
  base: "/",
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
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
        entryFileNames: "assets/kyte-mobile.js",
        chunkFileNames: "assets/kyte-mobile-[hash].js",
        assetFileNames: "assets/kyte-mobile.[ext]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_MOBILE_INPUT_DIAGNOSTIC": JSON.stringify("1"),
  },
});
