import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import {
  billsQuery,
  incomesQuery,
  paymentsQuery,
  profileQuery,
} from "@/lib/kyte/queries";
import {
  CATEGORY_COLORS,
  formatMoney,
  monthlyEquivalent,
  occurrencesInRange,
} from "@/lib/kyte/bills";

export const Route = createFileRoute("/app/insights")({
  head: () => ({ meta: [{ title: "Insights — Kyte" }] }),
  component: InsightsTab,
});

function InsightsTab() {
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: profile } = useQuery(profileQuery);
  const currency = profile?.currency ?? "USD";

  const data = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Scheduled this month, grouped by category.
    const cat = new Map<string, number>();
    let total = 0;
    for (const b of bills) {
      const occ = occurrencesInRange(b, start, end).length;
      const amt = occ * Number(b.amount);
      if (amt === 0) continue;
      cat.set(b.category, (cat.get(b.category) ?? 0) + amt);
      total += amt;
    }

    // Trailing 6 months of actual payments.
    const months: { label: string; amount: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = d;
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const paid = payments
        .filter((p) => {
          const dd = new Date(p.paid_on);
          return dd >= mStart && dd <= mEnd;
        })
        .reduce((s, p) => s + Number(p.amount), 0);
      months.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        amount: paid,
        key: `${d.getFullYear()}-${d.getMonth()}`,
      });
    }

    // Month-over-month delta.
    const thisMonth = months.at(-1)?.amount ?? 0;
    const lastMonth = months.at(-2)?.amount ?? 0;
    const mom = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // 6-month forward cashflow forecast (scheduled bills vs monthly income).
    const monthlyIncome = incomes.reduce(
      (s, i) => s + monthlyEquivalent(Number(i.amount), i.frequency),
      0,
    );
    const forecast: { label: string; expense: number; net: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const fStart = d;
      const fEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      let expense = 0;
      for (const b of bills) {
        expense += occurrencesInRange(b, fStart, fEnd).length * Number(b.amount);
      }
      forecast.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        expense,
        net: monthlyIncome - expense,
      });
    }

    return {
      byCategory: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      total,
      last6: months,
      thisMonth,
      lastMonth,
      mom,
      monthlyIncome,
      forecast,
    };
  }, [bills, payments, incomes]);

  const maxBar = Math.max(1, ...data.last6.map((m) => m.amount));
  const forecastAbsMax = Math.max(
    1,
    ...data.forecast.map((f) => Math.max(f.expense, Math.abs(f.net))),
  );

  return (
    <>
      <PageHeader title="Insights" subtitle="Where your money goes." />

      {/* MoM summary */}
      <section className="mx-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This month</p>
          <p className="mt-1 font-display text-2xl font-bold text-gradient-primary">
            {formatMoney(data.thisMonth, currency)}
          </p>
          <span className="hidden">{/* anchor */}</span>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
              data.mom > 0 ? "text-destructive" : data.mom < 0 ? "text-success" : "text-muted-foreground"
            }`}
          >
            {data.mom > 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : data.mom < 0 ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
            {data.lastMonth === 0 ? "No prior month" : `${data.mom > 0 ? "+" : ""}${data.mom.toFixed(0)}% vs last`}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly income</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatMoney(data.monthlyIncome, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Net {formatMoney(data.monthlyIncome - data.total, currency)} / mo
          </p>
        </div>
      </section>

      {/* Trailing 6 months bar chart */}
      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Spent — last 6 months</p>
        <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label="Spending over the last six months">
          {data.last6.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md bg-gradient-primary shadow-glow"
                style={{ height: `${(m.amount / maxBar) * 100}%`, minHeight: 2 }}
              />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6-month forecast */}
      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">6-month cashflow forecast</p>
        <div className="mt-4 flex h-32 items-center gap-2" role="img" aria-label="Forecast cashflow for the next six months">
          {data.forecast.map((f, i) => {
            const expPct = (f.expense / forecastAbsMax) * 50;
            const netPct = (Math.abs(f.net) / forecastAbsMax) * 50;
            return (
              <div key={i} className="flex flex-1 flex-col items-center justify-center gap-0.5">
                <div className="flex h-[50%] w-full items-end">
                  <div
                    className="w-full rounded-t bg-destructive/70"
                    style={{ height: `${expPct * 2}%`, minHeight: 2 }}
                    title={`Bills: ${formatMoney(f.expense, currency)}`}
                  />
                </div>
                <div className="flex h-[50%] w-full items-start">
                  <div
                    className={`w-full rounded-b ${f.net >= 0 ? "bg-success/70" : "bg-destructive"}`}
                    style={{ height: `${netPct * 2}%`, minHeight: 2 }}
                    title={`Net: ${formatMoney(f.net, currency)}`}
                  />
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">{f.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Red = scheduled bills · Green = projected leftover after bills.
        </p>
      </section>

      <section className="mt-6 px-5 pb-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">By category</h2>
          <span className="text-xs text-muted-foreground">{formatMoney(data.total, currency)} / mo</span>
        </div>

        {data.byCategory.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Add bills to see breakdowns.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {data.byCategory.map(([name, amt]) => {
              const pct = data.total > 0 ? (amt / data.total) * 100 : 0;
              const color = CATEGORY_COLORS[name] ?? "#0098FF";
              return (
                <li key={name} className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                      {name}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(amt, currency)}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background"
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${name} share`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
