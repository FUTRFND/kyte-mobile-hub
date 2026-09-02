import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "./native";

export const KYTE_OAUTH_CALLBACK = "com.kytepayments.app://auth/callback";

// Supabase (Lovable Cloud) only allows https redirects, so native auth is sent
// to this https bridge, which immediately re-emits the params onto
// KYTE_OAUTH_CALLBACK. See src/routes/auth.native.tsx.
export const KYTE_AUTH_BRIDGE_URL = "https://bright-sky-app-78.lovable.app/auth/native";

type OAuthProvider = "google" | "apple";
type CallbackResult = { session: Session | null; error: Error | null };
type CallbackSubscriber = (result: CallbackResult) => void | Promise<void>;

const subscribers = new Set<CallbackSubscriber>();
const callbackTasks = new Map<string, Promise<CallbackResult>>();
let nativeListenerTask: Promise<void> | null = null;

function isNativeMobile() {
  return import.meta.env.VITE_KYTE_MOBILE === "1" && isNative();
}

export function authRedirectUrl() {
  return isNativeMobile() ? KYTE_AUTH_BRIDGE_URL : window.location.origin;
}

function callbackParameters(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (
    parsed.protocol !== "com.kytepayments.app:" ||
    parsed.hostname !== "auth" ||
    parsed.pathname !== "/callback"
  ) {
    return null;
  }

  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash);
  return {
    code: query.get("code"),
    accessToken: fragment.get("access_token") ?? query.get("access_token"),
    refreshToken: fragment.get("refresh_token") ?? query.get("refresh_token"),
    error:
      query.get("error_description") ??
      fragment.get("error_description") ??
      query.get("error") ??
      fragment.get("error"),
  };
}

async function closeAuthBrowser() {
  if (!isNativeMobile()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // The browser may already be closed (for example, for an email link).
  }
}

export async function completeAuthCallback(rawUrl: string): Promise<CallbackResult> {
  const params = callbackParameters(rawUrl);
  if (!params) return { session: null, error: null };

  const existing = callbackTasks.get(rawUrl);
  if (existing) return existing;

  const task = (async (): Promise<CallbackResult> => {
    console.info("[mobile-auth] callback received", {
      hasCode: Boolean(params.code),
      hasTokens: Boolean(params.accessToken && params.refreshToken),
      hasError: Boolean(params.error),
    });

    try {
      if (params.error) throw new Error(params.error);

      if (params.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        return { session: data.session, error: null };
      }

      if (params.accessToken && params.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        if (error) throw error;
        return { session: data.session, error: null };
      }

      throw new Error("The authentication callback did not include a code or session tokens.");
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    } finally {
      await closeAuthBrowser();
    }
  })();

  callbackTasks.set(rawUrl, task);
  return task;
}

async function dispatchCallback(rawUrl: string) {
  const result = await completeAuthCallback(rawUrl);
  if (!result.session && !result.error) return;
  await Promise.allSettled([...subscribers].map((subscriber) => subscriber(result)));
}

async function installNativeListener() {
  if (!isNativeMobile()) return;
  const { App } = await import("@capacitor/app");
  await App.addListener("appUrlOpen", ({ url }) => {
    void dispatchCallback(url);
  });

  const launch = await App.getLaunchUrl();
  if (launch?.url) await dispatchCallback(launch.url);
}

export async function subscribeToMobileAuthCallbacks(subscriber: CallbackSubscriber) {
  subscribers.add(subscriber);
  if (!nativeListenerTask) nativeListenerTask = installNativeListener();
  await nativeListenerTask;
  return () => subscribers.delete(subscriber);
}

export async function startOAuth(provider: OAuthProvider) {
  if (!isNativeMobile()) {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) throw result.error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Must be the https bridge: Cloud rejects custom-scheme redirects.
      redirectTo: KYTE_AUTH_BRIDGE_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error(`${provider} did not return an authorization URL.`);

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}
