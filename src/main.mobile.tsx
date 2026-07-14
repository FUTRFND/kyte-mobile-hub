// Capacitor / SPA entry for mobile.
//
// Pre-auth is intentionally zero-React: no StrictMode, router, diagnostics,
// providers, global input/key/focus listeners, DOM observers, or auth-router
// invalidation can run while the user is typing credentials. After a valid
// session exists, the full Kyte React app mounts normally.
//
// Native OAuth uses Capacitor Browser + a custom URL scheme deep-link
// (com.kytepayments.app://auth/callback). Email verification links use the
// same scheme so tapping "Verify Email" reopens the app and completes sign-in.
import "./styles.css";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const rootEl = document.getElementById("root");
const MOBILE_DEBUG = import.meta.env.DEV;
const AUTH_REDIRECT = "com.kytepayments.app://auth/callback";

function log(label: string, data?: unknown) {
  if (!MOBILE_DEBUG) return;
  console.info(`[mobile:${Math.round(performance.now())}ms] ${label}`, data ?? "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);
}

function renderPlainLogin() {
  if (!rootEl) throw new Error("#root element missing from index.html");
  log("plain-login.render");
  rootEl.innerHTML = `
    <main class="relative flex min-h-screen flex-col overflow-y-auto overflow-x-hidden bg-background px-6 safe-top safe-bottom">
      <div class="relative flex flex-1 flex-col justify-center">
        <div class="mb-8 flex flex-col items-center gap-3">
          <div class="grid place-items-center rounded-2xl bg-primary" style="width:52px;height:52px" aria-hidden="true">
            <svg width="28.6" height="28.6" viewBox="0 0 24 24" fill="none"><path d="M5 4v16M5 12l9-8M5 12l9 8" stroke="#0B0B0D" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </div>
          <h1 class="font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p class="text-sm text-muted-foreground">Sign in to manage your bills.</p>
        </div>

        <div class="flex flex-col gap-3">
          <button id="kyte-google" type="button" class="flex h-12 items-center justify-center gap-3 rounded-xl border border-border bg-surface-elevated text-sm font-semibold text-foreground active:opacity-80">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.3 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.1 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2c-.4.4 6.8-5 6.8-14.8 0-1.2-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <button id="kyte-apple" type="button" class="flex h-12 items-center justify-center gap-3 rounded-xl bg-foreground text-sm font-semibold text-background active:opacity-80">Continue with Apple</button>
        </div>

        <div class="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span class="h-px flex-1 bg-border"></span>or email<span class="h-px flex-1 bg-border"></span>
        </div>

        <form id="kyte-login-form" class="flex flex-col gap-3" novalidate>
          <div>
            <label for="kyte-email" class="text-xs font-medium text-muted-foreground">Email</label>
            <input id="kyte-email" name="email" type="text" inputmode="email" autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="next" class="mt-1 h-12 w-full rounded-xl border border-input bg-surface px-3 text-base text-foreground outline-none placeholder:text-muted-foreground" placeholder="you@kyte.app" style="font-size:16px" />
            <p id="kyte-email-error" class="mt-1 hidden text-xs text-destructive"></p>
          </div>
          <div>
            <label for="kyte-password" class="text-xs font-medium text-muted-foreground">Password</label>
            <input id="kyte-password" name="password" type="password" autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="go" class="mt-1 h-12 w-full rounded-xl border border-input bg-surface px-3 text-base text-foreground outline-none placeholder:text-muted-foreground" placeholder="At least 8 characters" style="font-size:16px" />
            <p id="kyte-password-error" class="mt-1 hidden text-xs text-destructive"></p>
          </div>
          <div id="kyte-auth-error" class="hidden rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"></div>
          <button id="kyte-submit" type="submit" class="mt-2 h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60">Sign in</button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          New to Kyte? <button id="kyte-mode" type="button" class="font-semibold text-primary">Create account</button>
        </p>
      </div>
    </main>`;

  wirePlainLogin();
}

function setText(id: string, value: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.classList.toggle("hidden", !value);
}

function setSubmitting(submitting: boolean, mode: "signin" | "signup") {
  const button = document.getElementById("kyte-submit") as HTMLButtonElement | null;
  if (!button) return;
  button.disabled = submitting;
  button.textContent = submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account";
}

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email";
  if (password.length < 8) errors.password = "Min 8 characters";
  return errors;
}

function wirePlainLogin() {
  const form = document.getElementById("kyte-login-form") as HTMLFormElement | null;
  const modeButton = document.getElementById("kyte-mode") as HTMLButtonElement | null;
  const googleButton = document.getElementById("kyte-google") as HTMLButtonElement | null;
  const appleButton = document.getElementById("kyte-apple") as HTMLButtonElement | null;
  let mode: "signin" | "signup" = "signin";

  modeButton?.addEventListener("click", () => {
    mode = mode === "signin" ? "signup" : "signin";
    const heading = document.querySelector("h1");
    const sub = heading?.nextElementSibling;
    if (heading) heading.textContent = mode === "signin" ? "Welcome back" : "Create your account";
    if (sub) sub.textContent = mode === "signin" ? "Sign in to manage your bills." : "Start tracking bills in seconds.";
    if (modeButton) modeButton.textContent = mode === "signin" ? "Create account" : "Sign in";
    const prompt = modeButton?.parentElement;
    if (prompt) prompt.firstChild && (prompt.firstChild.textContent = mode === "signin" ? "New to Kyte? " : "Already have an account? ");
    setSubmitting(false, mode);
    setText("kyte-auth-error", "");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = document.getElementById("kyte-email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("kyte-password") as HTMLInputElement | null;
    const email = emailInput?.value ?? "";
    const password = passwordInput?.value ?? "";
    const errors = validate(email, password);
    setText("kyte-email-error", errors.email ?? "");
    setText("kyte-password-error", errors.password ?? "");
    setText("kyte-auth-error", "");
    if (errors.email || errors.password) return;

    setSubmitting(true, mode);
    try {
      log("plain-login.submit", { mode });
      const { supabase } = await import("./integrations/supabase/client");
      const result = mode === "signup"
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: AUTH_REDIRECT },
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (result.data.session) await mountFullApp("/app/home");
      else setText("kyte-auth-error", "Check your email to finish creating your account. Tap the link on this device to sign in.");
    } catch (err) {
      setText("kyte-auth-error", err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false, mode);
    }
  });

  const nativeOAuth = async (provider: "google" | "apple") => {
    setText("kyte-auth-error", "");
    try {
      log("oauth.start", { provider });
      const { supabase } = await import("./integrations/supabase/client");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: AUTH_REDIRECT,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Sign-in URL missing");
      log("oauth.open", { url: data.url });
      await Browser.open({ url: data.url, presentationStyle: "popover" });
    } catch (err) {
      log("oauth.failed", err);
      setText("kyte-auth-error", err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  googleButton?.addEventListener("click", () => void nativeOAuth("google"));
  appleButton?.addEventListener("click", () => void nativeOAuth("apple"));
}

/**
 * Deep-link handler.
 *
 * Fires when the OS reopens the app via com.kytepayments.app:// (OAuth callback,
 * verification email). Parses either a PKCE ?code=... or a token fragment
 * (#access_token=...&refresh_token=...), completes the Supabase session,
 * closes the in-app browser, and mounts the full app.
 */
async function handleAuthDeepLink(rawUrl: string) {
  log("deeplink.received", { rawUrl });
  try {
    const url = new URL(rawUrl);
    if (!/auth\/callback/.test(url.pathname) && !/auth\/callback/.test(url.host + url.pathname)) {
      log("deeplink.ignored", { rawUrl });
      return;
    }
    const { supabase } = await import("./integrations/supabase/client");

    const errorDescription = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (errorDescription) {
      log("deeplink.error", { errorDescription });
      setText("kyte-auth-error", errorDescription);
      try { await Browser.close(); } catch {}
      return;
    }

    // PKCE / email verification: ?code=...
    const code = url.searchParams.get("code");
    if (code) {
      log("deeplink.exchangeCode");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      try { await Browser.close(); } catch {}
      if (data.session) await mountFullApp("/app/home");
      return;
    }

    // Implicit grant: #access_token=...&refresh_token=...
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (hash) {
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        log("deeplink.setSession");
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        try { await Browser.close(); } catch {}
        await mountFullApp("/app/home");
        return;
      }
    }

    // Fallback: verified email but no tokens — try existing session.
    const { data } = await supabase.auth.getSession();
    try { await Browser.close(); } catch {}
    if (data.session) await mountFullApp("/app/home");
    else setText("kyte-auth-error", "Signed in on another device. Please sign in here.");
  } catch (err) {
    log("deeplink.failed", err);
    try { await Browser.close(); } catch {}
    setText("kyte-auth-error", err instanceof Error ? err.message : "Sign-in failed");
  }
}

async function mountFullApp(target = "/app/home") {
  if (!rootEl) throw new Error("#root element missing from index.html");
  if (window.location.hash !== `#${target}`) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
  }
  log("full-app.mount.start", { target });

  const [{ createRoot }, { QueryClient, QueryClientProvider }, { RouterProvider, createHashHistory, createRouter }, { routeTree }] = await Promise.all([
    import("react-dom/client"),
    import("@tanstack/react-query"),
    import("@tanstack/react-router"),
    import("./routeTree.gen"),
  ]);

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

  createRoot(rootEl).render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  log("full-app.mount.done");
}

async function boot() {
  if (!rootEl) throw new Error("#root element missing from index.html");
  log("boot.start");

  // Register the deep-link listener BEFORE any auth call, so an OAuth
  // callback delivered while boot is still running is not missed.
  try {
    await CapacitorApp.addListener("appUrlOpen", (event) => {
      void handleAuthDeepLink(event.url);
    });
  } catch (err) {
    log("boot.deeplink.register.failed", err);
  }

  const { supabase } = await import("./integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  log("boot.session.done", { hasSession: Boolean(data.session) });
  if (data.session) await mountFullApp("/app/home");
  else renderPlainLogin();
}

boot().catch((err) => {
  console.error("[boot] fatal", err);
  if (rootEl) rootEl.innerHTML = `<main class="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground"><div><h1 class="text-xl font-semibold">Kyte failed to start</h1><p class="mt-2 text-sm text-muted-foreground">${escapeHtml(err instanceof Error ? err.message : String(err))}</p></div></main>`;
});
