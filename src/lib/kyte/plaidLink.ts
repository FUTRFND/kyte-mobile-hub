import { Capacitor, registerPlugin } from "@capacitor/core";

const PLAID_SDK_URL = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

export type PlaidInstitution = { id: string | null; name: string | null };
export type PlaidLinkResult = {
  publicToken?: string;
  institution?: PlaidInstitution;
  cancelled?: boolean;
};

type PlaidPlugin = { open(options: { token: string }): Promise<PlaidLinkResult> };
const NativePlaidLink = registerPlugin<PlaidPlugin>("PlaidLink");

declare global {
  interface Window {
    Plaid?: {
      create(options: {
        token: string;
        onSuccess(publicToken: string, metadata: { institution?: { institution_id?: string; name?: string } }): void;
        onExit(error: { display_message?: string; error_message?: string } | null): void;
      }): { open(): void; destroy(): void };
    };
  }
}

let sdkPromise: Promise<void> | null = null;
function loadWebSdk(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLAID_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load Plaid Link"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export async function openPlaidLink(token: string): Promise<PlaidLinkResult> {
  if (Capacitor.isNativePlatform()) return NativePlaidLink.open({ token });
  await loadWebSdk();
  if (!window.Plaid) throw new Error("Plaid Link is unavailable");
  return new Promise((resolve, reject) => {
    let handler: ReturnType<NonNullable<typeof window.Plaid>["create"]>;
    handler = window.Plaid!.create({
      token,
      onSuccess: (publicToken, metadata) => {
        handler.destroy();
        resolve({
          publicToken,
          institution: {
            id: metadata.institution?.institution_id ?? null,
            name: metadata.institution?.name ?? null,
          },
        });
      },
      onExit: (error) => {
        handler.destroy();
        if (error) reject(new Error(error.display_message ?? error.error_message ?? "Plaid Link failed"));
        else resolve({ cancelled: true });
      },
    });
    handler.open();
  });
}
