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
  plugins: {
    Keyboard: {
      // Native resize only. Do NOT let the plugin scroll, resize the body,
      // or reposition the WebView — those hooks caused input freezes on iOS.
      resize: "native",
      resizeOnFullScreen: false,
    },
  },
};

export default config;
