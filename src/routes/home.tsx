import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, Wallet } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PreviewBillRow } from "@/components/kyte/PreviewBillRow";
import { PageHeader } from "@/components/kyte/PageHeader";
import { formatMoney, nextDue, occurrencesInRange } from "@/lib/kyte/bills";
import { previewBills, previewPayments, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — Kyte" }] }),
  component: HomePreviewPage,
});

function HomePreviewPage() {
  const currency = previewProfile.currency;

  const { upcoming, monthTotal, paidThisMonth, remainingThisMonth } = useMemo(() => {
    const sorted = [...previewBills].sort((a, b) => nextDue(a).getTime() - nextDue(b).getTime());
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthSum = previewBills.reduce((sum, bill) => {
      const occ = occurrencesInRange(bill, monthStart, monthEnd).length;
      return sum + occ * Number(bill.amount);
    }, 0);
    const paid = previewPayments
      .filter((payment) => {
        const date = new Date(payment.paid_on);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      upcoming: sorted,
      monthTotal: monthSum,
      paidThisMonth: paid,
      remainingThisMonth: Math.max(0, monthSum - paid),
    };
  }, []);

  return (
    <PreviewAppShell>
      <PageHeader
        title={`Hi, ${previewProfile.display_name}`}
        subtitle="Here's what's coming up."
        right={
          <button className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Bill
          </button>
        }
      />

      <section className="mx-5 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">This month</p>
        <p className="mt-1 font-display text-3xl font-bold text-foreground">
          {formatMoney(monthTotal, currency)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Paid" value={formatMoney(paidThisMonth, currency)} tone="ok" />
          <Stat label="Remaining" value={formatMoney(remainingThisMonth, currency)} tone="primary" />
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Upcoming</h2>
        <ul className="flex flex-col gap-2">
          {upcoming.map((bill) => (
            <li key={bill.id}>
              <PreviewBillRow bill={bill} currency={currency} />
            </li>
          ))}
        </ul>
      </section>
    </PreviewAppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ok" | "primary" }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${tone === "ok" ? "text-foreground" : "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface">
        <Wallet className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground">No bills yet</h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        Track rent, subscriptions, utilities — anything that comes back.
      </p>
      <button className="mt-2 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
        Add your first bill
      </button>
    </div>
  );
}
