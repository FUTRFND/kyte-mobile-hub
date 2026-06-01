import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Check, History, Clock, CreditCard, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { billsQuery, paymentsQuery, profileQuery } from "@/lib/kyte/queries";
import { useQueryClient } from "@tanstack/react-query";
import {
  CATEGORY_COLORS,
  formatMoney,
  frequencyLabel,
  nextDue,
  toISODate,
} from "@/lib/kyte/bills";
import { BillFormSheet } from "@/components/kyte/BillFormSheet";
import { verifyBiometric } from "@/lib/kyte/biometric";
import { enqueueMarkPaid, flushPending } from "@/lib/kyte/offlineQueue";
import { AnimatedMoney, Sparkline } from "@/lib/kyte/animated";

export const Route = createFileRoute("/app/bill/$id")({
  head: () => ({ meta: [{ title: "Bill — Kyte" }] }),
  component: BillDetail,
});

function BillDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: profile } = useQuery(profileQuery);
  const currency = profile?.currency ?? "USD";
  const bill = bills.find((b) => b.id === id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const billPayments = useMemo(
    () => (bill ? payments.filter((p) => p.bill_id === bill.id) : []),
    [payments, bill],
  );

  if (!bill) {
    return (
      <div className="px-6 pt-20 text-center text-sm text-muted-foreground">
        Bill not found.
        <button
          onClick={() => nav({ to: "/app/home" })}
          className="mt-4 block w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
        >
          Back
        </button>
      </div>
    );
  }

  const due = nextDue(bill);
  const daysUntil = Math.round((due.getTime() - Date.now()) / 86_400_000);
  const dot = bill.color || CATEGORY_COLORS[bill.category] || "#0098FF";
  const totalPaid = billPayments.reduce((s, p) => s + Number(p.amount), 0);
  const sparkValues = billPayments
    .slice(0, 8)
    .reverse()
    .map((p) => Number(p.amount));

  const markPaid = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }
    const entry = {
      user_id: u.user.id,
      bill_id: bill.id,
      amount: Number(bill.amount),
      paid_on: toISODate(new Date()),
      period_date: toISODate(due),
      bill_name: bill.name,
      bill_category: bill.category,
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueMarkPaid(entry);
    } else {
      const { error } = await supabase.from("bill_payments").insert({
        user_id: entry.user_id,
        bill_id: entry.bill_id,
        amount: entry.amount,
        paid_on: entry.paid_on,
        period_date: entry.period_date,
      });
      if (error) {
        await enqueueMarkPaid(entry);
      } else {
        await supabase.from("transactions").insert({
          user_id: u.user.id,
          name: bill.name,
          amount: Number(bill.amount),
          kind: "expense",
          category: bill.category,
          occurred_on: toISODate(new Date()),
          notes: `Bill payment · ${bill.name}`,
        });
      }
    }
    await flushPending();
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  const payNow = async () => {
    if (profile?.pay_requires_biometric) {
      const ok = await verifyBiometric(`Authorize payment for ${bill.name}`);
      if (!ok) return;
    }
    alert(
      `Pay Now\n\n${bill.name} — ${formatMoney(Number(bill.amount), currency)}\n\nWhen you connect a Teller account, this opens the issuer's payment link. For now you can log it with “Mark as paid”.`,
    );
  };

  const snooze = async () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    await supabase.from("bills").update({ snoozed_until: toISODate(next) }).eq("id", bill.id);
    qc.invalidateQueries({ queryKey: ["bills"] });
  };

  const remove = async () => {
    if (!confirm("Delete this bill?")) return;
    await supabase.from("bills").delete().eq("id", bill.id);
    qc.invalidateQueries({ queryKey: ["bills"] });
    nav({ to: "/app/home" });
  };

  const dueLabel =
    daysUntil < 0
      ? `${Math.abs(daysUntil)}d overdue`
      : daysUntil === 0
      ? "Due today"
      : daysUntil === 1
      ? "Due tomorrow"
      : `Due in ${daysUntil}d`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero with color glow */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-32 h-72 opacity-30 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${dot}, transparent)` }}
          aria-hidden
        />
        <header className="relative flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => nav({ to: "/app/home" })}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </header>

        <section className="relative px-6 pt-4 pb-6 text-center">
          <span
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl font-display text-xl font-bold text-white shadow-glow"
            style={{ background: dot }}
            aria-hidden
          >
            {bill.name.slice(0, 1).toUpperCase()}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{bill.name}</h1>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {bill.category} · {frequencyLabel(bill.frequency)}
          </p>
          <div className="mt-6 font-display text-5xl font-bold text-foreground">
            <AnimatedMoney value={Number(bill.amount)} currency={currency} />
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                daysUntil < 0
                  ? "bg-destructive animate-pulse-glow"
                  : daysUntil <= 2
                  ? "bg-primary animate-pulse-glow"
                  : "bg-muted-foreground"
              }`}
            />
            <span
              className={`font-semibold ${
                daysUntil < 0
                  ? "text-destructive"
                  : daysUntil <= 2
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              {dueLabel}
            </span>
            <span className="text-muted-foreground">
              · {due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          {bill.snoozed_until && (
            <p className="mt-2 text-xs text-primary">Snoozed until {bill.snoozed_until}</p>
          )}
        </section>
      </div>

      {/* Quick stats */}
      <section className="mx-5 grid grid-cols-3 gap-2 rounded-3xl border border-border bg-surface-elevated p-3 text-center">
        <Stat label="Paid all-time" value={formatMoney(totalPaid, currency)} />
        <Stat label="Payments" value={String(billPayments.length)} />
        <Stat label="Avg" value={billPayments.length ? formatMoney(totalPaid / billPayments.length, currency) : "—"} />
      </section>

      {sparkValues.length >= 2 && (
        <section className="mx-5 mt-3 rounded-3xl border border-border bg-surface-elevated p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Payment trend
            </p>
            <p className="text-[11px] text-muted-foreground">Last {sparkValues.length}</p>
          </div>
          <Sparkline values={sparkValues} className="h-12 w-full" />
        </section>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 px-5">
        <button
          onClick={payNow}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98]"
        >
          <CreditCard className="h-5 w-5" /> Pay now
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={markPaid}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> Mark as paid
          </button>
          <button
            onClick={snooze}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground transition active:scale-[0.98]"
          >
            <Clock className="h-4 w-4" /> Snooze 1d
          </button>
        </div>
      </div>

      {bill.notes && (
        <section className="mt-6 px-5">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Notes</h2>
          <p className="mt-2 rounded-2xl border border-border bg-surface p-4 text-sm text-foreground whitespace-pre-wrap">
            {bill.notes}
          </p>
        </section>
      )}

      <section className="mt-6 px-5">
        <h2 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Payment history
        </h2>
        {billPayments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No payments logged yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {billPayments.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
                  <span className="text-sm text-foreground">
                    {new Date(p.paid_on).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(Number(p.amount), currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 px-5 pb-10">
        <button
          onClick={remove}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive transition active:scale-[0.98]"
        >
          <Trash2 className="h-4 w-4" /> Delete bill
        </button>
      </div>

      <BillFormSheet open={editing} onClose={() => setEditing(false)} bill={bill} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
