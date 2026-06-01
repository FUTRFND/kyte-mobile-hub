import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, Check, Settings, History, Wallet, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/kyte/queries";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"] as const;

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — Kyte" }] }),
  component: ProfileTab,
});

function ProfileTab() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate field when profile arrives
  if (profile && displayName === "" && !saving && !saved) {
    // one-shot hydration
    if (profile.display_name) setDisplayName(profile.display_name);
  }

  const updateField = async (patch: { display_name?: string; currency?: string }) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("profiles").update(patch).eq("user_id", u.user.id);
    await qc.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  };

  const initials = (profile?.display_name ?? "K")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeader title="Profile" />

      <section className="mx-5 flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface-elevated p-6">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground">
          {initials}
        </div>
        <p className="font-display text-lg font-bold text-foreground">
          {profile?.display_name ?? "Kyte user"}
        </p>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Account</h2>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Display name</span>
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 flex-1 rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
              />
              <button
                onClick={() => updateField({ display_name: displayName })}
                disabled={saving || displayName === profile?.display_name}
                className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saved ? <Check className="h-4 w-4" /> : "Save"}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Currency</span>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => updateField({ currency: c })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    profile?.currency === c
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">More</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          <NavLink to="/app/history" icon={History} label="Transaction history" />
          <NavLink to="/app/income" icon={Wallet} label="Income sources" />
          <NavLink to="/app/settings" icon={Settings} label="Settings & security" />
        </div>
      </section>

      <section className="mt-8 px-5 pb-10">
        <button
          onClick={signOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground active:opacity-80"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </>
  );
}

function NavLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/app/history" | "/app/income" | "/app/settings";
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
