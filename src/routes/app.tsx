import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { Home, CalendarDays, BarChart3, User2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
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
  return (
    <div className="flex min-h-screen flex-col bg-background safe-top">
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
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium"
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
