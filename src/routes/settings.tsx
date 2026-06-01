import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Bell, Download, FileText, Fingerprint, Moon, Sparkles } from "lucide-react";
import { previewBills, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Kyte" }] }),
  component: SettingsPreviewPage,
});

function SettingsPreviewPage() {
  return (
    <div className="min-h-dvh bg-background safe-top pb-10">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-xl font-bold text-foreground">Settings</h1>
      </header>

      <Section title="Budget">
        <div className="px-5 pb-4">
          <p className="text-xs text-muted-foreground">Monthly budget</p>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="text-sm font-semibold text-foreground">${previewProfile.monthly_budget?.toFixed(0)}</span>
            <span className="text-xs text-primary">Saved</span>
          </div>
        </div>
      </Section>

      <Section title="Reminders" icon={Bell}>
        <div className="px-5 pb-4">
          <p className="mb-3 text-xs text-muted-foreground">Notify me these many days before each bill is due</p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 3, 7, 14].map((day) => {
              const active = previewProfile.reminder_days_array.includes(day);
              return (
                <span
                  key={day}
                  className={`grid h-11 place-items-center rounded-xl text-sm font-semibold ${
                    active ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted-foreground'
                  }`}
                >
                  {day === 0 ? 'Day of' : `${day}d`}
                </span>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {['Push', 'Email'].map((channel, index) => (
              <span
                key={channel}
                className={`grid h-11 place-items-center rounded-xl text-sm font-semibold ${
                  index === 0 || channel === 'Email' ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted-foreground'
                }`}
              >
                {channel}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Smart timing is on for {previewBills.length} active bills.</p>
        </div>
      </Section>

      <Section title="Security" icon={Fingerprint}>
        <Row icon={Fingerprint} label="Biometric unlock" value="Enabled" />
        <Row icon={Moon} label="Require biometric to mark paid" value="Off" />
      </Section>

      <Section title="Reports & export" icon={FileText}>
        <Row icon={Download} label="Export full data" value="TXT / CSV" />
        <Row icon={FileText} label="Monthly statement" value="PDF ready" />
      </Section>

      <Section title="Offline & automation" icon={Sparkles}>
        <Row icon={Sparkles} label="Offline payment queue" value="Enabled" />
        <Row icon={Bell} label="Auto-reschedule reminders" value="On" />
      </Section>

      <section className="mt-6 px-5">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" /> Delete account
        </button>
      </section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="mt-5 px-5">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span>{title}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
