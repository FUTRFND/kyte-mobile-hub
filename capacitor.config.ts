import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor packages the static SPA bundle from `dist/` (produced by
// `bun run build:mobile`). No `server.url` — the app runs fully offline-capable
// on-device and talks to Lovable Cloud (Supabase) over HTTPS directly.
const config: CapacitorConfig = {
  appId: "app.lovable.kyte.mobile",
  appName: "Kyte",
  webDir: "dist",
  backgroundColor: "#0B0B0D",
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0B0B0D",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0B0B0D",
    },
  },
};

export default config;
