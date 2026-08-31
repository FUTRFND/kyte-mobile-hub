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
import {
  authRedirectUrl,
  subscribeToMobileAuthCallbacks,
} from "./lib/kyte/mobileAuth";

const rootEl = document.getElementById("root");
const MOBILE_DEBUG = import.meta.env.DEV;
let fullAppMountPromise: Promise<void> | null = null;
let pendingAuthError = "";

function mobileTimingLog(label: string, data?: unknown) {
  if (!MOBILE_DEBUG) return;
  console.info(`[mobile:${Math.round(performance.now())}ms] ${label}`, data ?? "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);
}

function renderPlainLogin() {
  if (!rootEl) throw new Error("#root element missing from index.html");
  mobileTimingLog("plain-login.render");
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
  if (pendingAuthError) setText("kyte-auth-error", pendingAuthError);
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
      mobileTimingLog("plain-login.submit", { mode });
      const { supabase } = await import("./integrations/supabase/client");
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirectUrl() } })
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

}

async function mountFullApp(target = "/app/home") {
  if (fullAppMountPromise) return fullAppMountPromise;
  fullAppMountPromise = mountFullAppOnce(target);
  return fullAppMountPromise;
}

async function mountFullAppOnce(target: string) {
  if (!rootEl) throw new Error("#root element missing from index.html");
  if (window.location.hash !== `#${target}`) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
  }
  mobileTimingLog("full-app.mount.start", { target });

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
  mobileTimingLog("full-app.mount.done");
}

async function boot() {
  if (!rootEl) throw new Error("#root element missing from index.html");
  mobileTimingLog("boot.start");
  let unsubscribe: (() => void) | undefined;
  unsubscribe = await subscribeToMobileAuthCallbacks(async ({ session, error }) => {
    mobileTimingLog("auth.callback.done", { hasSession: Boolean(session), hasError: Boolean(error) });
    if (error) {
      pendingAuthError = error.message;
      setText("kyte-auth-error", error.message);
      return;
    }
    if (session) {
      unsubscribe?.();
      await mountFullApp("/app/home");
    }
  });
  const { supabase } = await import("./integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  mobileTimingLog("boot.session.done", { hasSession: Boolean(data.session) });
  if (data.session) {
    unsubscribe();
    await mountFullApp("/app/home");
  }
  else renderPlainLogin();
}

boot().catch((err) => {
  console.error("[boot] fatal", err);
  if (rootEl) rootEl.innerHTML = `<main class="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground"><div><h1 class="text-xl font-semibold">Kyte failed to start</h1><p class="mt-2 text-sm text-muted-foreground">${escapeHtml(err instanceof Error ? err.message : String(err))}</p></div></main>`;
});
