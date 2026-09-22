import type { CapacitorConfig } from "@capacitor/cli";

// Packages the static SPA from `dist/` (produced by `bun run build:mobile`).
// No `server.url` — the app runs offline-capable on-device and reaches
// Lovable Cloud (Supabase) over HTTPS directly.
const config: CapacitorConfig = {
  appId: "com.kytepayments.app",
  appName: "Kyte",
  webDir: "dist",
  backgroundColor: "#0B0B0D",
  ios: {
    contentInset: "always",
  },
};

export default config;
