import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Fingerprint,
  ChevronRight,
  Wallet,
  Download,
  AlertTriangle,
  FileText,
  Landmark,
  Moon,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  billsQuery,
  incomesQuery,
  paymentsQuery,
  profileQuery,
  transactionsQuery,
} from "@/lib/kyte/queries";
import { isNative } from "@/lib/kyte/native";
import type { ReminderPrefs } from "@/lib/kyte/notifications";
import { seedDemoData } from "@/lib/kyte/demoData";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Kyte" }] }),
  component: SettingsPage,
});

const LEAD_OPTIONS = [0, 1, 3, 7, 14];
const CHANNEL_OPTIONS = [
  { id: "push", label: "Push" },
  { id: "email", label: "Email" },
];

function lastNMonths(n: number, from = new Date()): { year: number; monthIndex: number }[] {
  const out: { year: number; monthIndex: number }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    out.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return out;
}

function SettingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);

  const [budget, setBudget] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    import("@/lib/kyte/biometric").then(({ biometricStatus }) => {
      biometricStatus().then((s) => setBioAvailable(s === "available"));
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setBudget(profile.monthly_budget != null ? String(profile.monthly_budget) : "");
  }, [profile]);

  const prefs: ReminderPrefs = useMemo(
    () => ({
      daysBefore: profile?.reminder_days_array ?? [2],
      channels: profile?.reminder_channels ?? ["push"],
      quietStart: profile?.quiet_hours_start ?? null,
      quietEnd: profile?.quiet_hours_end ?? null,
      smartTiming: profile?.smart_timing ?? false,
    }),
    [profile],
  );

  type ProfilePatch = Partial<{
    monthly_budget: number | null;
    reminder_days_array: number[];
    reminder_channels: string[];
    quiet_hours_start: number | null;
    quiet_hours_end: number | null;
    smart_timing: boolean;
    biometric_enabled: boolean;
    pay_requires_biometric: boolean;
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

  const toggleLead = async (d: number) => {
    const { rescheduleAll } = await import("@/lib/kyte/notifications");
    const cur = new Set(prefs.daysBefore);
    cur.has(d) ? cur.delete(d) : cur.add(d);
    const arr = Array.from(cur).sort((a, b) => b - a);
    const next = arr.length ? arr : [0];
    await patch({ reminder_days_array: next });
    await rescheduleAll(bills, { ...prefs, daysBefore: next });
  };

  const toggleChannel = async (id: string) => {
    const { rescheduleAll } = await import("@/lib/kyte/notifications");
    const cur = new Set(prefs.channels);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    const next = Array.from(cur);
    await patch({ reminder_channels: next });
    await rescheduleAll(bills, { ...prefs, channels: next });
  };

  const setQuiet = async (key: "quiet_hours_start" | "quiet_hours_end", v: string) => {
    const n = v === "" ? null : Number(v);
    await patch({ [key]: n } as ProfilePatch);
  };

  const toggleSmart = async (on: boolean) => {
    await patch({ smart_timing: on });
  };

  const toggleBiometric = async (on: boolean) => {
    if (on) {
      const { verifyBiometric } = await import("@/lib/kyte/biometric");
      const ok = await verifyBiometric("Enable lock");
      if (!ok) return;
    }
    await patch({ biometric_enabled: on });
  };

  const togglePayBio = async (on: boolean) => {
    await patch({ pay_requires_biometric: on });
  };

  const toggleNotifications = async () => {
    const { ensurePermission, rescheduleAll } = await import("@/lib/kyte/notifications");
    const ok = await ensurePermission();
    if (ok) await rescheduleAll(bills, prefs);
    alert(ok ? "Reminders scheduled." : "Permission denied or web preview.");
  };

  const exportAll = async () => {
    const { downloadFile, toCSV } = await import("@/lib/kyte/export");
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

  const downloadReport = async (year: number, monthIndex: number) => {
    const { buildMonthlyReport, downloadBlob } = await import("@/lib/kyte/report");
    const blob = buildMonthlyReport({
      year,
      monthIndex,
      displayName: profile?.display_name ?? "Kyte user",
      currency: profile?.currency ?? "USD",
      bills,
      payments,
      transactions: txns,
    });
    const tag = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    downloadBlob(`kyte-statement-${tag}.pdf`, blob);
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

      <Section title="Demo data" icon={Sparkles}>
        <DemoSeeder />
      </Section>

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
            Notify me these many days before each bill is due
          </p>
          <div className="grid grid-cols-5 gap-2">
            {LEAD_OPTIONS.map((d) => {
              const on = prefs.daysBefore.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleLead(d)}
                  className={`h-11 rounded-xl text-sm font-semibold ${
                    on
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {d === 0 ? "Day of" : `${d}d`}
                </button>
              );
            })}
          </div>

          <p className="mt-4 mb-2 text-xs text-muted-foreground">Channels</p>
          <div className="grid grid-cols-2 gap-2">
            {CHANNEL_OPTIONS.map((c) => {
              const on = prefs.channels.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleChannel(c.id)}
                  className={`h-11 rounded-xl text-sm font-semibold ${
                    on
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={toggleNotifications}
            className="mt-3 h-11 w-full rounded-xl border border-border bg-surface text-sm font-semibold text-foreground"
          >
            {isNative() ? "Enable / reschedule notifications" : "Notifications run on-device only"}
          </button>
        </div>
      </Section>

      <Section title="Quiet hours" icon={Moon}>
        <div className="px-5 pb-4">
          <p className="mb-2 text-xs text-muted-foreground">
            We'll push reminders out of this window.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <HourSelect
              label="From"
              value={prefs.quietStart}
              onChange={(v) => setQuiet("quiet_hours_start", v)}
            />
            <HourSelect
              label="To"
              value={prefs.quietEnd}
              onChange={(v) => setQuiet("quiet_hours_end", v)}
            />
          </div>
        </div>
        <Row label="Smart timing" sub="Adjust send window automatically" icon={Sparkles}>
          <Toggle checked={prefs.smartTiming} onChange={toggleSmart} />
        </Row>
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
        <Row
          label="Confirm before paying"
          sub="Biometric prompt before opening Pay Now"
        >
          <Toggle
            disabled={!bioAvailable || !isNative()}
            checked={profile?.pay_requires_biometric ?? false}
            onChange={togglePayBio}
          />
        </Row>
      </Section>

      <Section title="Linked accounts" icon={Landmark}>
        <Link
          to="/app/accounts"
          className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-surface/50"
        >
          <Landmark className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold text-foreground">Manage banks (Teller)</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Section>

      <Section title="Monthly statements" icon={FileText}>
        <div className="px-5 pb-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Download a PDF summary for any of the last six months.
          </p>
          <ul className="flex flex-col gap-2">
            {lastNMonths(6).map(({ year, monthIndex }) => (
              <li key={`${year}-${monthIndex}`}>
                <button
                  onClick={() => downloadReport(year, monthIndex)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground active:opacity-80"
                >
                  <span>
                    {new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Download className="h-4 w-4 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        </div>
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
          onClick={() => setDeleteOpen(true)}
          className="w-full px-5 py-4 text-left text-sm font-semibold text-destructive active:bg-destructive/10"
        >
          Delete account & all data
        </button>
      </Section>

      <div className="h-10" />

      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const { data: u } = await supabase.auth.getUser();
          if (!u.user) return;
          await supabase.from("transactions").delete().eq("user_id", u.user.id);
          await supabase.from("incomes").delete().eq("user_id", u.user.id);
          await supabase.from("bill_payments").delete().eq("user_id", u.user.id);
          await supabase.from("bills").delete().eq("user_id", u.user.id);
          await supabase.from("accounts").delete().eq("user_id", u.user.id);
          await supabase.from("profiles").delete().eq("user_id", u.user.id);
          await supabase.auth.signOut();
          nav({ to: "/login", replace: true });
        }}
      />
    </>
  );
}

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
      >
        <option value="">Off</option>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, "0")}:00
          </option>
        ))}
      </select>
    </label>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) setText("");
  }, [open]);
  if (!open) return null;
  const armed = text.trim().toUpperCase() === "DELETE";
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-border bg-background p-5 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-destructive">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This permanently removes your bills, payments, income, transactions, linked accounts, and
          profile. This cannot be undone. Type <strong className="text-foreground">DELETE</strong> to
          confirm.
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="DELETE"
          className="mt-4 h-12 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="h-12 flex-1 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            disabled={!armed || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className="h-12 flex-1 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoSeeder() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { bills: number; transactions: number }>(null);
  const run = async () => {
    setBusy(true);
    try {
      const out = await seedDemoData();
      setDone({ bills: out.bills, transactions: out.transactions });
      qc.invalidateQueries();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted-foreground">
        Populate realistic bills, income, and transactions so every screen looks alive. Your linked
        Teller accounts stay untouched.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {busy ? "Seeding…" : done ? "Re-seed demo data" : "Load demo data"}
      </button>
      {done && (
        <p className="mt-2 text-[11px] text-success">
          Loaded {done.bills} bills and {done.transactions} transactions. ✨
        </p>
      )}
    </div>
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
  icon: Icon,
  children,
}: {
  label: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
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
