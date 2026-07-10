import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { KyteMark } from "./index";
import { Apple, Mail } from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checkedSessionRef = useRef(false);

  // Run session check ONCE on mount — not on every keystroke.
  useEffect(() => {
    if (checkedSessionRef.current) return;
    checkedSessionRef.current = true;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && data.session) navigate({ to: "/app/home", replace: true });
      })
      .catch((err) => console.warn("[login] session check failed", err));
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

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
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/app/home", replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        if (data.session) navigate({ to: "/app/home", replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    setError(null);
    const res = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (res.error) setError(res.error.message ?? "Sign-in failed");
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-y-auto overflow-x-hidden bg-background px-6 safe-top safe-bottom">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-hero, hsl(var(--primary)))" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "hsl(var(--primary))" }}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center gap-3 animate-fade-in-up">
          <KyteMark size={52} />
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to manage your bills." : "Start tracking bills in seconds."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => oauth("google")}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-border bg-surface-elevated text-sm font-semibold text-foreground active:opacity-80"
          >
            <GoogleGlyph /> Continue with Google
          </button>
          <button
            onClick={() => oauth("apple")}
            className="flex h-12 items-center justify-center gap-3 rounded-xl bg-foreground text-sm font-semibold text-background active:opacity-80"
          >
            <Apple className="h-5 w-5" /> Continue with Apple
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="kyte-email" className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-surface px-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                id="kyte-email"
                name="email"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
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
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.3 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.1 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2c-.4.4 6.8-5 6.8-14.8 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
