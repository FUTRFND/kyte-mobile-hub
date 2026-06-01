import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, History, Landmark, LogOut, Settings, Wallet } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PageHeader } from "@/components/kyte/PageHeader";
import { previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Kyte" }] }),
  component: ProfilePreviewPage,
});

function ProfilePreviewPage() {
  const initials = (previewProfile.display_name ?? "K")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PreviewAppShell>
      <PageHeader title="Profile" />

      <section className="mx-5 flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface-elevated p-6">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground">
          {initials}
        </div>
        <p className="font-display text-lg font-bold text-foreground">{previewProfile.display_name}</p>
        <p className="text-sm text-muted-foreground">{previewProfile.currency} · Monthly budget set</p>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Account</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4">
          <div>
            <p className="text-xs text-muted-foreground">Display name</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{previewProfile.display_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Default currency</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['USD', 'EUR', 'GBP', 'CAD'].map((currency) => (
                <span
                  key={currency}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    previewProfile.currency === currency
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface text-muted-foreground'
                  }`}
                >
                  {currency}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">More</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          <NavLink to="/history" icon={History} label="Transaction history" />
          <NavLink to="/income" icon={Wallet} label="Income sources" />
          <NavLink to="/accounts" icon={Landmark} label="Linked banks" />
          <NavLink to="/settings" icon={Settings} label="Settings & security" />
        </div>
      </section>

      <section className="mt-8 px-5 pb-10">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </PreviewAppShell>
  );
}

function NavLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/history" | "/income" | "/accounts" | "/settings";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-5 py-4 active:bg-surface/50">
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
