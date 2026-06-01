import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, CreditCard, History, Trash2 } from "lucide-react";
import { CATEGORY_COLORS, formatMoney, frequencyLabel, nextDue } from "@/lib/kyte/bills";
import { getPreviewBill, previewPayments, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/bill/$id")({
  head: () => ({ meta: [{ title: "Bill — Kyte" }] }),
  component: BillPreviewPage,
});

function BillPreviewPage() {
  const { id } = Route.useParams();
  const bill = getPreviewBill(id);
  const currency = previewProfile.currency;

  if (!bill) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bill not found.</h1>
          <Link to="/home" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const due = nextDue(bill);
  const billPayments = previewPayments.filter((payment) => payment.bill_id === bill.id).slice(0, 12);
  const dot = bill.color || CATEGORY_COLORS[bill.category] || '#0098FF';

  return (
    <div className="flex min-h-dvh flex-col bg-background safe-top">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link to="/home" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-primary">Edit</button>
      </header>

      <section className="px-6 pt-6 text-center">
        <span className="mx-auto block h-14 w-14 rounded-2xl" style={{ background: dot }} aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{bill.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{bill.category} · {frequencyLabel(bill.frequency)}</p>
        <p className="mt-6 font-display text-5xl font-bold text-foreground">{formatMoney(Number(bill.amount), currency)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Next due {due.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        {bill.snoozed_until ? <p className="mt-1 text-xs text-primary">Snoozed until {bill.snoozed_until}</p> : null}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-3 px-5">
        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground">
          <CreditCard className="h-5 w-5" /> Pay now
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground">
            <Check className="h-4 w-4" /> Mark as paid
          </button>
          <button className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" /> Snooze 1d
          </button>
        </div>
      </div>

      {bill.notes ? (
        <section className="mt-6 px-5">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Notes</h2>
          <p className="mt-2 rounded-2xl border border-border bg-surface p-4 text-sm whitespace-pre-wrap text-foreground">{bill.notes}</p>
        </section>
      ) : null}

      <section className="mt-6 px-5">
        <h2 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Payment history
        </h2>
        <ul className="flex flex-col gap-2">
          {billPayments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="text-sm text-foreground">{new Date(payment.paid_on).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-sm font-semibold text-foreground">{formatMoney(Number(payment.amount), currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 px-5 pb-10">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive">
          <Trash2 className="h-4 w-4" /> Delete bill
        </button>
      </div>
    </div>
  );
}
