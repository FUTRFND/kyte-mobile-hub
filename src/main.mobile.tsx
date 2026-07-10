// Capacitor / SPA entry. Bootstraps the same file-based route tree as the
// TanStack Start preview, but mounted in CSR mode — no SSR, no server fns.
//
// Hardened for native WebViews:
// - A throw BEFORE React mounts surfaces as a visible error card, not a
//   silent black WebView.
// - A throw AFTER React mounts is logged but NEVER wipes the app. iOS
//   WebViews emit benign errors on keyboard focus (ResizeObserver loop,
//   cross-origin script errors from autofill, Capacitor Keyboard plugin
//   promise rejections). Wiping #root on those looks like an app crash.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import "./styles.css";
import { routeTree } from "./routeTree.gen";
import { supabase } from "./integrations/supabase/client";
import { installGlobalDiagnosticHandlers, recordDiagnostic } from "./mobile/diagnostics";
import { DiagnosticsOverlay } from "./mobile/DiagnosticsOverlay";
import { DiagnosticsBoundary } from "./mobile/DiagnosticsBoundary";

installGlobalDiagnosticHandlers();


const rootEl = document.getElementById("root");

// Flipped to true the moment React commits its first render. After that,
// no global error handler is allowed to touch the DOM.
let reactMounted = false;

function paintFatal(title: string, detail: string) {
  const target = rootEl ?? document.body;
  if (!target) return;
  target.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0B0B0D;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:420px;text-align:center;">
        <div style="font-size:20px;font-weight:700;margin-bottom:8px;">${title}</div>
        <div style="font-size:13px;opacity:.7;white-space:pre-wrap;word-break:break-word;">${detail}</div>
        <button onclick="location.reload()" style="margin-top:20px;padding:10px 22px;border-radius:10px;background:#0098FF;color:#0B0B0D;font-weight:700;border:0;font-size:14px;">Reload</button>
      </div>
    </div>`;
}

// Benign errors iOS WebView / Capacitor fire routinely — especially on input
// focus when the software keyboard opens and layout reflows. Never treat
// these as fatal.
function isBenignError(payload: unknown): boolean {
  const msg = String(
    (payload as { message?: string; reason?: unknown })?.message ??
      (payload as { reason?: unknown })?.reason ??
      payload ??
      "",
  ).toLowerCase();
  return (
    !msg ||
    msg === "null" ||
    msg === "undefined" ||
    msg.includes("resizeobserver") ||
    msg.includes("non-error promise rejection") ||
    msg.includes("script error") ||
    msg.includes("load failed") // WKWebView network noise
  );
}

async function configureNativeKeyboard() {
  // Keep this best-effort: a missing/unavailable native plugin must never block
  // React from mounting or turn into a startup fatal screen.
  try {
    // @ts-expect-error — injected by Capacitor on-device
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const { Keyboard, KeyboardResize, KeyboardStyle } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setStyle({ style: KeyboardStyle.Dark });
  } catch (err) {
    console.warn("[boot] native keyboard configuration skipped", err);
  }
}

// Global safety nets — pre-mount throws paint the fatal card, post-mount
// throws are logged only. iOS keyboard-focus noise is filtered.
window.addEventListener("error", (e) => {
  if (isBenignError(e)) return;
  console.error("[boot] window.error", e.error ?? e.message);
  recordDiagnostic("window.error", e.error ?? { message: e.message });
  if (!reactMounted && rootEl) {
    paintFatal("Something went wrong", String(e.error?.stack || e.message || e));
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (isBenignError(e)) return;
  console.error("[boot] unhandledrejection", e.reason);
  recordDiagnostic("unhandledrejection", e.reason);
  if (!reactMounted && rootEl) {
    paintFatal("Something went wrong", String(e.reason?.stack || e.reason || "Unknown error"));
  }
});


async function boot() {
  if (!rootEl) throw new Error("#root element missing from index.html");

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });

  const router = createRouter({
    routeTree,
    history: createHashHistory(),
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  // Keep TanStack Query + router in sync with Supabase auth (best-effort).
  try {
    supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
  } catch (err) {
    console.warn("[boot] supabase auth listener failed", err);
  }

  void configureNativeKeyboard();

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <DiagnosticsBoundary>
          <RouterProvider router={router} />
        </DiagnosticsBoundary>
        <DiagnosticsOverlay />
      </QueryClientProvider>
    </StrictMode>,
  );


  // Mark mounted on the next frame — by then React has committed and the
  // boot-fallback is gone. Any error after this point must not wipe the UI.
  requestAnimationFrame(() => {
    reactMounted = true;
  });
}

boot().catch((err) => {
  console.error("[boot] fatal", err);
  recordDiagnostic("boot.fatal", err);
  paintFatal("Kyte failed to start", String(err?.stack || err?.message || err));

});
