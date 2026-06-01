import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Home, User2, type LucideIcon } from "lucide-react";

const tabs: Array<{ to: "/home" | "/calendar" | "/insights" | "/profile"; label: string; icon: LucideIcon }> = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User2 },
];

export function PreviewAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background safe-top">
      <main className="flex-1 pb-24">{children}</main>
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
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium"
                aria-label={label}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
