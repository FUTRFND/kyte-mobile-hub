// Loads the Teller Connect SDK and opens the enrollment flow.
// https://teller.io/docs/connect/web
const SDK_URL = "https://cdn.teller.io/connect/connect.js";

declare global {
  interface Window {
    TellerConnect?: {
      setup: (opts: TellerSetupOptions) => { open: () => void };
    };
  }
}

export type TellerEnrollment = {
  accessToken: string;
  user: { id: string };
  enrollment: { id: string; institution: { name: string } };
  signatures?: string[];
};

type TellerSetupOptions = {
  applicationId: string;
  environment: "sandbox" | "development" | "production";
  selectAccount?: "disabled" | "single" | "multiple";
  products?: string[];
  onInit?: () => void;
  onSuccess: (enrollment: TellerEnrollment) => void;
  onExit?: () => void;
  onFailure?: (failure: unknown) => void;
};

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.TellerConnect) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load Teller Connect SDK"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export async function openTellerConnect(opts: {
  applicationId: string;
  environment?: "sandbox" | "development" | "production";
  onSuccess: (enrollment: TellerEnrollment) => void;
  onExit?: () => void;
  onFailure?: (failure: unknown) => void;
}) {
  await loadSdk();
  if (!window.TellerConnect) throw new Error("Teller SDK unavailable");
  const connect = window.TellerConnect.setup({
    applicationId: opts.applicationId,
    environment: opts.environment ?? "sandbox",
    selectAccount: "multiple",
    products: ["transactions", "balance"],
    onSuccess: opts.onSuccess,
    onExit: opts.onExit,
    onFailure: opts.onFailure,
  });
  connect.open();
}
