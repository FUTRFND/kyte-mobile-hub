import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PageHeader } from "@/components/kyte/PageHeader";
import { CATEGORY_COLORS, formatMoney } from "@/lib/kyte/bills";
import { previewBills, previewPayments, previewProfile, previewTransactions } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — Kyte" }] }),
  component: HistoryPreviewPage,
});

function HistoryPreviewPage() {
  const currency = previewProfile.currency;
  const billMap = new Map(previewBills.map((bill) => [bill.id, bill]));
  const entries = [
    ...previewPayments.map((payment) => {
      const bill = billMap.get(payment.bill_id);
      return {
        id: `p:${payment.id}`,
        date: payment.paid_on,
        name: bill?.name ?? 'Bill payment',
        amount: Number(payment.amount),
        kind: 'expense' as const,
        category: bill?.category ?? 'Other',
      };
    }),
    ...previewTransactions.map((txn) => ({
      id: `t:${txn.id}`,
      date: txn.occurred_on,
      name: txn.name,
      amount: Number(txn.amount),
      kind: txn.kind,
      category: txn.category,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const income = entries.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <PreviewAppShell>
      <PageHeader
        title="History"
        right={
          <button className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-foreground" aria-label="Export CSV">
            <Download className="h-4 w-4" />
          </button>
        }
      />

      <section className="mx-5 grid grid-cols-3 gap-2 rounded-3xl border border-border bg-surface-elevated p-3 text-center">
        <Stat label="In" value={formatMoney(income, currency)} tone="ok" />
        <Stat label="Out" value={formatMoney(expense, currency)} tone="muted" />
        <Stat label="Net" value={formatMoney(income - expense, currency)} tone={(income - expense) >= 0 ? 'primary' : 'danger'} />
      </section>

      <section className="mt-5 px-5">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-surface px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value="" readOnly placeholder="Search…" className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="mb-4 flex gap-2">
          {['all', 'expense', 'income'].map((filter, index) => (
            <button
              key={filter}
              className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${
                index === 0 ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2 pb-4">
          {entries.map((entry) => {
            const color = CATEGORY_COLORS[entry.category] ?? '#0098FF';
            return (
              <li key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: `${color}33`, border: `1px solid ${color}66` }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {entry.category}
                  </p>
                </div>
                <p className={`text-sm font-bold ${entry.kind === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {entry.kind === 'income' ? '+' : '−'}{formatMoney(entry.amount, currency)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </PreviewAppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'muted' | 'primary' | 'danger';
}) {
  const cls = tone === 'primary' ? 'text-primary' : tone === 'danger' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-bold ${cls}`}>{value}</p>
    </div>
  );
}
