import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.kyte.mobile",
  appName: "Kyte",
  webDir: ".output/public",
  // Hot-reload from the Lovable sandbox preview during development.
  // Replace `cleartext` with `false` and remove `server.url` before
  // building a production .ipa / .apk.
  server: {
    url: "https://id-preview--4d02cc2d-7149-4dbd-b575-87e8c389e0b5.lovable.app",
    cleartext: true,
  },
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
