import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, CalendarDays, BarChart3, User2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BiometricGate } from "@/components/kyte/BiometricGate";
import { installOfflineQueue } from "@/lib/kyte/offlineQueue";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

type Tab = { to: string; label: string; icon: LucideIcon };
const tabs: Tab[] = [
  { to: "/app/home", label: "Home", icon: Home },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/insights", label: "Insights", icon: BarChart3 },
  { to: "/app/profile", label: "Profile", icon: User2 },
];

function AppShell() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const sessionHydratedRef = useRef(false);

  useEffect(() => {
    installOfflineQueue();
  }, []);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!sessionHydratedRef.current) return;
      setHasSession(Boolean(session));
      setAuthReady(true);
    });

    (async () => {
      const sessionCheck = supabase.auth
        .getSession()
        .then(({ data }) => Boolean(data.session))
        .catch((err) => {
          console.warn("[app] session check failed", err);
          return false;
        });
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500));
      const hasSessionNow = await Promise.race([sessionCheck, timeout]);
      if (!active) return;
      sessionHydratedRef.current = true;
      setHasSession(hasSessionNow);
      setAuthReady(true);
    })();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authReady && !hasSession) {
      navigate({ to: "/login", replace: true });
    }
  }, [authReady, hasSession, navigate]);

  if (!authReady) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  if (!hasSession) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  return (
    <BiometricGate>
      <div className="flex min-h-dvh flex-col bg-background safe-top">
        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  activeProps={{
                    className: "text-primary [&_.tab-pill]:opacity-100 [&_.tab-dot]:scale-100",
                    "aria-current": "page",
                  }}
                  inactiveProps={{
                    className: "text-muted-foreground [&_.tab-pill]:opacity-0 [&_.tab-dot]:scale-0",
                  }}
                  aria-label={label}
                  className="group relative flex min-h-11 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition active:scale-95"
                >
                  <span
                    className="tab-pill absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary transition-opacity duration-200"
                    aria-hidden
                  />
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    <span
                      className="tab-dot absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary transition-transform duration-200"
                      aria-hidden
                    />
                  </span>
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </BiometricGate>
  );
}
