import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { BillRow } from "@/components/kyte/BillRow";
import { BillFormSheet } from "@/components/kyte/BillFormSheet";
import { billsQuery, paymentsQuery, profileQuery } from "@/lib/kyte/queries";
import {
  formatMoney,
  nextDue,
  occurrencesInRange,
} from "@/lib/kyte/bills";

export const Route = createFileRoute("/app/home")({
  head: () => ({ meta: [{ title: "Home — Kyte" }] }),
  component: HomeTab,
});

function HomeTab() {
  const { data: bills = [], isLoading } = useQuery(billsQuery);
  const { data: profile } = useQuery(profileQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const [adding, setAdding] = useState(false);
  const currency = profile?.currency ?? "USD";

  const { upcoming, monthTotal, paidThisMonth, remainingThisMonth } = useMemo(() => {
    const sorted = [...bills].sort((a, b) => nextDue(a).getTime() - nextDue(b).getTime());
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthSum = bills.reduce((s, b) => {
      const occ = occurrencesInRange(b, monthStart, monthEnd).length;
      return s + occ * Number(b.amount);
    }, 0);
    const paid = payments
      .filter((p) => {
        const d = new Date(p.paid_on);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, p) => s + Number(p.amount), 0);
    return {
      upcoming: sorted,
      monthTotal: monthSum,
      paidThisMonth: paid,
      remainingThisMonth: Math.max(0, monthSum - paid),
    };
  }, [bills, payments]);

  return (
    <>
      <PageHeader
        title={`Hi${profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}`}
        subtitle="Here's what's coming up."
        right={
          <button
            onClick={() => setAdding(true)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
          >
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

        {isLoading ? (
          <SkeletonList />
        ) : upcoming.length === 0 ? (
          <Empty onAdd={() => setAdding(true)} />
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((b) => (
              <li key={b.id}>
                <BillRow bill={b} currency={currency} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <BillFormSheet open={adding} onClose={() => setAdding(false)} />
    </>
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

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
      ))}
    </ul>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface">
        <Wallet className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground">No bills yet</h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        Track rent, subscriptions, utilities — anything that comes back.
      </p>
      <button
        onClick={onAdd}
        className="mt-2 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        Add your first bill
      </button>
    </div>
  );
}
