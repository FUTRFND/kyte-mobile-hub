// Native auth bridge.
//
// Lovable Cloud's managed Supabase redirect allow-list only accepts https
// origins, so email verification and native OAuth are sent here instead of
// straight to com.kytepayments.app://auth/callback. This route re-emits the
// exact same auth parameters onto the custom scheme so the existing native
// completeAuthCallback() parser (fragment tokens AND ?code=) finishes the
// session inside the installed app.
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const NATIVE_CALLBACK = "com.kytepayments.app://auth/callback";

const AUTH_KEYS = [
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "type",
  "provider_token",
  "provider_refresh_token",
  "code",
  "error",
  "error_code",
  "error_description",
] as const;

function pick(source: URLSearchParams) {
  const out = new URLSearchParams();
  for (const key of AUTH_KEYS) {
    const value = source.get(key);
    if (value !== null) out.set(key, value);
  }
  return out;
}

/** Builds com.kytepayments.app://auth/callback with the params Supabase returned. */
export function buildNativeCallbackUrl(href: string) {
  const url = new URL(href);
  const query = pick(url.searchParams);
  const hash = pick(new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash));

  let target = NATIVE_CALLBACK;
  if (query.size > 0) target += `?${query.toString()}`;
  if (hash.size > 0) target += `#${hash.toString()}`;
  return target;
}

export const Route = createFileRoute("/auth/native")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Returning you to Kyte" },
      { name: "description", content: "Completing sign-in and returning to the Kyte app." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Returning you to Kyte" },
      { property: "og:description", content: "Completing sign-in and returning to the Kyte app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NativeAuthBridge,
});

function NativeAuthBridge() {
  const [target, setTarget] = useState<string | null>(null);

  const handoff = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  useEffect(() => {
    const url = buildNativeCallbackUrl(window.location.href);
    setTarget(url);
    handoff(url);
  }, [handoff]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div
        className="grid place-items-center rounded-2xl bg-primary"
        style={{ width: 52, height: 52 }}
        aria-hidden="true"
      >
        <svg width="28.6" height="28.6" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 4v16M5 12l9-8M5 12l9 8"
            stroke="#0B0B0D"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground">Kyte</h1>
      <p className="text-sm text-muted-foreground">Returning you to Kyte…</p>
      <button
        type="button"
        onClick={() => handoff(target ?? buildNativeCallbackUrl(window.location.href))}
        className="mt-2 h-12 min-w-[200px] rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground active:opacity-90"
      >
        Open Kyte
      </button>
    </main>
  );
}
