import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Fingerprint,
  ChevronRight,
  Wallet,
  Download,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  billsQuery,
  incomesQuery,
  paymentsQuery,
  profileQuery,
  transactionsQuery,
} from "@/lib/kyte/queries";
import { biometricStatus } from "@/lib/kyte/biometric";
import { isNative } from "@/lib/kyte/native";
import { ensurePermission, rescheduleAll } from "@/lib/kyte/notifications";
import { downloadFile, toCSV } from "@/lib/kyte/export";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Kyte" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);

  const [budget, setBudget] = useState("");
  const [leadDays, setLeadDays] = useState(2);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    biometricStatus().then((s) => setBioAvailable(s === "available"));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setBudget(profile.monthly_budget != null ? String(profile.monthly_budget) : "");
    setLeadDays(profile.reminder_days_default);
  }, [profile]);

  type ProfilePatch = Partial<{
    monthly_budget: number | null;
    reminder_days_default: number;
    biometric_enabled: boolean;
  }>;
  const patch = async (p: ProfilePatch) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("profiles").update(p).eq("user_id", u.user.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const saveBudget = () => {
    const n = budget === "" ? null : Number(budget);
    patch({ monthly_budget: n });
  };

  const saveLead = async (n: number) => {
    setLeadDays(n);
    await patch({ reminder_days_default: n });
    await rescheduleAll(bills, n);
  };

  const toggleBiometric = async (on: boolean) => {
    if (on) {
      const { verifyBiometric } = await import("@/lib/kyte/biometric");
      const ok = await verifyBiometric("Enable lock");
      if (!ok) return;
    }
    await patch({ biometric_enabled: on });
  };

  const toggleNotifications = async () => {
    const ok = await ensurePermission();
    if (ok) await rescheduleAll(bills, leadDays);
    alert(ok ? "Reminders scheduled." : "Permission denied or web preview.");
  };

  const exportAll = () => {
    const lines: string[] = [];
    lines.push("# Bills\n" + toCSV(bills, ["name", "amount", "due_date", "frequency", "category", "notes"]));
    lines.push("\n# Payments\n" + toCSV(payments, ["paid_on", "bill_id", "amount", "period_date"]));
    lines.push("\n# Incomes\n" + toCSV(incomes, ["name", "amount", "frequency", "start_date"]));
    lines.push(
      "\n# Transactions\n" +
        toCSV(txns, ["occurred_on", "name", "kind", "category", "amount", "notes"]),
    );
    downloadFile(`kyte-export-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"), "text/plain");
  };

  const deleteData = async () => {
    if (!confirm("This permanently deletes your bills, payments, income, transactions, and profile. Continue?")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("transactions").delete().eq("user_id", u.user.id);
    await supabase.from("incomes").delete().eq("user_id", u.user.id);
    await supabase.from("bill_payments").delete().eq("user_id", u.user.id);
    await supabase.from("bills").delete().eq("user_id", u.user.id);
    await supabase.from("profiles").delete().eq("user_id", u.user.id);
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  };

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => nav({ to: "/app/profile" })}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">Settings</h1>
      </header>

      <Section title="Budget">
        <label className="block px-5 pb-3">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Monthly budget
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
              className="h-12 flex-1 rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
            />
            <button
              onClick={saveBudget}
              className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Save
            </button>
          </div>
        </label>
      </Section>

      <Section title="Reminders" icon={Bell}>
        <div className="px-5 pb-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Notify me this many days before each bill is due
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 7].map((d) => (
              <button
                key={d}
                onClick={() => saveLead(d)}
                className={`h-11 rounded-xl text-sm font-semibold ${
                  leadDays === d
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-surface text-muted-foreground"
                }`}
              >
                {d === 0 ? "Day of" : `${d}d`}
              </button>
            ))}
          </div>
          <button
            onClick={toggleNotifications}
            className="mt-3 h-11 w-full rounded-xl border border-border bg-surface text-sm font-semibold text-foreground"
          >
            {isNative() ? "Enable / reschedule notifications" : "Notifications run on-device only"}
          </button>
        </div>
      </Section>

      <Section title="Security" icon={Fingerprint}>
        <Row
          label="Biometric lock"
          sub={
            bioAvailable
              ? "Require Face ID / Touch ID to open Kyte"
              : isNative()
              ? "Not available on this device"
              : "Only available in the installed app"
          }
        >
          <Toggle
            disabled={!bioAvailable || !isNative()}
            checked={profile?.biometric_enabled ?? false}
            onChange={toggleBiometric}
          />
        </Row>
      </Section>

      <Section title="Data" icon={Wallet}>
        <button
          onClick={exportAll}
          className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-surface/50"
        >
          <Download className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold text-foreground">Export everything</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <Link
          to="/app/income"
          className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-surface/50"
        >
          <Wallet className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold text-foreground">Manage income</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Section>

      <Section title="Danger zone" icon={AlertTriangle} tone="danger">
        <button
          onClick={deleteData}
          className="w-full px-5 py-4 text-left text-sm font-semibold text-destructive active:bg-destructive/10"
        >
          Delete all data & sign out
        </button>
      </Section>

      <div className="h-10" />
    </>
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2
        className={`mb-2 flex items-center gap-2 px-5 text-xs uppercase tracking-wider ${
          tone === "danger" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h2>
      <div className="mx-5 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? "bg-primary" : "bg-surface"
      } ${disabled ? "opacity-40" : ""}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-foreground transition ${
          checked ? "right-1" : "left-1"
        }`}
      />
    </button>
  );
}
