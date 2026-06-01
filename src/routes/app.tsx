import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    installOfflineQueue();
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  if (!hasSession) {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  return (
    <BiometricGate>
      <div className="flex min-h-dvh flex-col bg-background safe-top">
        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  activeProps={{ className: "text-primary", "aria-current": "page" }}
                  inactiveProps={{ className: "text-muted-foreground" }}
                  aria-label={label}
                  className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium"
                >
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
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
