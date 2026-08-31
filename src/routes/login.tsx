import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  authRedirectUrl,
  subscribeToMobileAuthCallbacks,
} from "@/lib/kyte/mobileAuth";
import { KyteMark } from "./index";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Min 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Kyte" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checkedSessionRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  mobileTimingLog("login.render", { mode, submitting, hasError: Boolean(error) });

  // Run session check ONCE on mount — not on every keystroke.
  useEffect(() => {
    if (checkedSessionRef.current) return;
    checkedSessionRef.current = true;
    mobileTimingLog("login.session-check.start");
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        mobileTimingLog("login.session-check.done", { hasSession: Boolean(data.session) });
        const activeField = document.activeElement;
        const userIsEditing = activeField === emailRef.current || activeField === passwordRef.current;
        if (active && data.session && !userIsEditing) navigate({ to: "/app/home", replace: true });
      })
      .catch((err) => {
        mobileTimingLog("login.session-check.failed", err);
        console.warn("[login] session check failed", err);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void subscribeToMobileAuthCallbacks(({ session, error: callbackError }) => {
      if (!active) return;
      if (callbackError) {
        setError(callbackError.message);
      } else if (session) {
        navigate({ to: "/app/home", replace: true });
      }
    }).then((remove) => {
      if (active) unsubscribe = remove;
      else remove();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      setSubmitting(false);
      return;
    }

    try {
      mobileTimingLog("login.submit.start", { mode });
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        mobileTimingLog("login.submit.signup.done", { hasSession: Boolean(data.session) });
        if (data.session) navigate({ to: "/app/home", replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        mobileTimingLog("login.submit.signin.done", { hasSession: Boolean(data.session) });
        if (data.session) navigate({ to: "/app/home", replace: true });
      }
    } catch (e) {
      mobileTimingLog("login.submit.failed", e);
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-y-auto overflow-x-hidden bg-background px-6 safe-top safe-bottom">
      <div className="relative flex flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <KyteMark size={52} />
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to manage your bills." : "Start tracking bills in seconds."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="kyte-email" className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="mt-1 rounded-xl border border-input bg-surface px-3">
              <input
                id="kyte-email"
                name="email"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="next"
                ref={emailRef}
                className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="you@kyte.app"
                style={{ fontSize: 16 }}
              />
            </div>
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="kyte-password" className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              id="kyte-password"
              name="password"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              ref={passwordRef}
              className="mt-1 h-12 w-full rounded-xl border border-input bg-surface px-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="At least 8 characters"
              style={{ fontSize: 16 }}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Kyte?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/onboarding" className="underline-offset-2 hover:underline">View tour again</Link>
        </p>
      </div>
    </main>
  );
}

function mobileTimingLog(label: string, data?: unknown) {
  if (!import.meta.env.DEV) return;
  console.info(`[mobile:${Math.round(performance.now())}ms] ${label}`, data ?? "");
}
