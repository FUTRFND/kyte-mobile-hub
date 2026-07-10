// Temporary Capacitor diagnostic build. Run with: `vite build --config vite.config.mobile.ts`.
// This intentionally emits a static dist/index.html with no JavaScript runtime,
// no React bootstrap, no router, no backend client, and no native plugin calls.
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "mobile-static"),
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
  },
});
