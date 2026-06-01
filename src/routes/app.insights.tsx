import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { billsQuery, paymentsQuery, profileQuery } from "@/lib/kyte/queries";
import {
  CATEGORY_COLORS,
  formatMoney,
  occurrencesInRange,
} from "@/lib/kyte/bills";

export const Route = createFileRoute("/app/insights")({
  head: () => ({ meta: [{ title: "Insights — Kyte" }] }),
  component: InsightsTab,
});

function InsightsTab() {
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: profile } = useQuery(profileQuery);
  const currency = profile?.currency ?? "USD";

  const { byCategory, total, last6 } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const cat = new Map<string, number>();
    let total = 0;
    for (const b of bills) {
      const occ = occurrencesInRange(b, start, end).length;
      const amt = occ * Number(b.amount);
      if (amt === 0) continue;
      cat.set(b.category, (cat.get(b.category) ?? 0) + amt);
      total += amt;
    }
    const months: { label: string; amount: number }[] = [];
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
      months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), amount: paid });
    }
    return {
      byCategory: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      total,
      last6: months,
    };
  }, [bills, payments]);

  const maxBar = Math.max(1, ...last6.map((m) => m.amount));

  return (
    <>
      <PageHeader title="Insights" subtitle="Where your money goes." />

      <section className="mx-5 rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Spent — last 6 months</p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {last6.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md bg-primary/80"
                style={{ height: `${(m.amount / maxBar) * 100}%`, minHeight: 2 }}
              />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">By category</h2>
          <span className="text-xs text-muted-foreground">{formatMoney(total, currency)} / mo</span>
        </div>

        {byCategory.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Add bills to see breakdowns.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {byCategory.map(([name, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              const color = CATEGORY_COLORS[name] ?? "#0098FF";
              return (
                <li key={name} className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      {name}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(amt, currency)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
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
