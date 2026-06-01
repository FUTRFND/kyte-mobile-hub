import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PageHeader } from "@/components/kyte/PageHeader";
import { CATEGORY_COLORS, formatMoney, monthlyEquivalent, occurrencesInRange } from "@/lib/kyte/bills";
import { previewBills, previewIncomes, previewPayments, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights — Kyte" }] }),
  component: InsightsPreviewPage,
});

function InsightsPreviewPage() {
  const currency = previewProfile.currency;
  const now = new Date();
  const cat = new Map<string, number>();
  let total = 0;

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const bill of previewBills) {
    const occ = occurrencesInRange(bill, start, end).length;
    const amount = occ * Number(bill.amount);
    if (!amount) continue;
    cat.set(bill.category, (cat.get(bill.category) ?? 0) + amount);
    total += amount;
  }

  const last6 = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const mStart = d;
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const paid = previewPayments
      .filter((payment) => {
        const dd = new Date(payment.paid_on);
        return dd >= mStart && dd <= mEnd;
      })
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { label: d.toLocaleDateString(undefined, { month: 'short' }), amount: paid, key: `${d.getFullYear()}-${d.getMonth()}` };
  });

  const thisMonth = last6.at(-1)?.amount ?? 0;
  const lastMonth = last6.at(-2)?.amount ?? 0;
  const mom = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  const monthlyIncome = previewIncomes.reduce((sum, income) => sum + monthlyEquivalent(Number(income.amount), income.frequency), 0);
  const forecast = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() + index, 1);
    const fStart = d;
    const fEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    let expense = 0;
    for (const bill of previewBills) expense += occurrencesInRange(bill, fStart, fEnd).length * Number(bill.amount);
    return { label: d.toLocaleDateString(undefined, { month: 'short' }), expense, net: monthlyIncome - expense };
  });

  const byCategory = [...cat.entries()].sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(1, ...last6.map((month) => month.amount));
  const forecastAbsMax = Math.max(1, ...forecast.map((entry) => Math.max(entry.expense, Math.abs(entry.net))));

  return (
    <PreviewAppShell>
      <PageHeader title="Insights" subtitle="Where your money goes." />

      <section className="mx-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This month</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{formatMoney(thisMonth, currency)}</p>
          <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${mom > 0 ? 'text-destructive' : mom < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {mom > 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : mom < 0 ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
            {lastMonth === 0 ? 'No prior month' : `${mom > 0 ? '+' : ''}${mom.toFixed(0)}% vs last`}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly income</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{formatMoney(monthlyIncome, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Net {formatMoney(monthlyIncome - total, currency)} / mo</p>
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Spent — last 6 months</p>
        <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label="Spending over the last six months">
          {last6.map((month) => (
            <div key={month.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(month.amount / maxBar) * 100}%`, minHeight: 2 }} />
              <span className="text-[10px] text-muted-foreground">{month.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">6-month cashflow forecast</p>
        <div className="mt-4 flex h-32 items-center gap-2" role="img" aria-label="Forecast cashflow for the next six months">
          {forecast.map((entry) => {
            const expPct = (entry.expense / forecastAbsMax) * 50;
            const netPct = (Math.abs(entry.net) / forecastAbsMax) * 50;
            return (
              <div key={entry.label} className="flex flex-1 flex-col items-center justify-center gap-0.5">
                <div className="flex h-[50%] w-full items-end">
                  <div className="w-full rounded-t bg-destructive/70" style={{ height: `${expPct * 2}%`, minHeight: 2 }} />
                </div>
                <div className="flex h-[50%] w-full items-start">
                  <div className={`w-full rounded-b ${entry.net >= 0 ? 'bg-primary/70' : 'bg-destructive'}`} style={{ height: `${netPct * 2}%`, minHeight: 2 }} />
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">{entry.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 px-5 pb-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">By category</h2>
          <span className="text-xs text-muted-foreground">{formatMoney(total, currency)} / mo</span>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {byCategory.map(([name, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            const color = CATEGORY_COLORS[name] ?? '#0098FF';
            return (
              <li key={name} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                    {name}
                  </span>
                  <span className="font-semibold text-foreground">{formatMoney(amount, currency)}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </PreviewAppShell>
  );
}
