import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import {
  billsQuery,
  incomesQuery,
  paymentsQuery,
  profileQuery,
  transactionsQuery,
} from "@/lib/kyte/queries";
import {
  CATEGORY_COLORS,
  formatMoney,
  monthlyEquivalent,
  occurrencesInRange,
} from "@/lib/kyte/bills";
import { AnimatedMoney } from "@/lib/kyte/animated";

export const Route = createFileRoute("/app/insights")({
  head: () => ({ meta: [{ title: "Insights — Kyte" }] }),
  component: InsightsTab,
});

function InsightsTab() {
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);
  const { data: profile } = useQuery(profileQuery);
  const currency = profile?.currency ?? "USD";
  const [range, setRange] = useState<6 | 12>(6);

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

    // Trailing N months: income (positive txns) vs spend (negative txns).
    const months: {
      label: string;
      key: string;
      income: number;
      spend: number;
      net: number;
    }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = d;
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      let income = 0;
      let spend = 0;
      for (const t of txns) {
        const dd = new Date(t.occurred_on);
        if (dd < mStart || dd > mEnd) continue;
        const a = Number(t.amount);
        if (a >= 0) income += a;
        else spend += Math.abs(a);
      }
      months.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        income,
        spend,
        net: income - spend,
      });
    }

    const thisMonth = months.at(-1)?.spend ?? 0;
    const lastMonth = months.at(-2)?.spend ?? 0;
    const mom = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Avg monthly income / spend over period
    const avgIncome = months.reduce((s, m) => s + m.income, 0) / Math.max(1, months.length);
    const avgSpend = months.reduce((s, m) => s + m.spend, 0) / Math.max(1, months.length);

    const monthlyIncome = incomes.reduce(
      (s, i) => s + monthlyEquivalent(Number(i.amount), i.frequency),
      0,
    );
    const monthlyIncomeEst = monthlyIncome > 0 ? monthlyIncome : avgIncome;

    // 6-month forward forecast (scheduled bills vs monthly income).
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
        net: monthlyIncomeEst - expense,
      });
    }

    // Top merchants (this month, negative txns aggregated by name).
    const merchantMap = new Map<string, { amount: number; count: number }>();
    for (const t of txns) {
      const dd = new Date(t.occurred_on);
      if (dd < start || dd > end) continue;
      const a = Number(t.amount);
      if (a >= 0) continue;
      const cur = merchantMap.get(t.name) ?? { amount: 0, count: 0 };
      cur.amount += Math.abs(a);
      cur.count += 1;
      merchantMap.set(t.name, cur);
    }
    const topMerchants = [...merchantMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    return {
      byCategory: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      total,
      months,
      thisMonth,
      lastMonth,
      mom,
      monthlyIncome: monthlyIncomeEst,
      avgIncome,
      avgSpend,
      forecast,
      topMerchants,
      paidThisMonth: payments
        .filter((p) => {
          const d = new Date(p.paid_on);
          return d >= start && d <= end;
        })
        .reduce((s, p) => s + Number(p.amount), 0),
    };
  }, [bills, payments, incomes, txns, range]);

  const forecastAbsMax = Math.max(
    1,
    ...data.forecast.map((f) => Math.max(f.expense, Math.abs(f.net))),
  );

  return (
    <>
      <PageHeader title="Insights" subtitle="Where your money goes." />

      {/* Cashflow hero */}
      <section className="mx-5 animate-fade-in-up">
        <div className="card-premium glow-ring relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70" aria-hidden />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Net cashflow · {range}mo avg
                </p>
                <AnimatedMoney
                  value={data.avgIncome - data.avgSpend}
                  currency={currency}
                  className="mt-1.5 block font-display text-[34px] font-bold leading-none text-foreground"
                />
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-success">
                    <ArrowUpRight className="h-3 w-3" /> {formatMoney(data.avgIncome, currency)} in
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <ArrowDownRight className="h-3 w-3" /> {formatMoney(data.avgSpend, currency)} out
                  </span>
                </div>
              </div>
              <div className="flex rounded-full bg-background/60 p-0.5">
                {[6, 12].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRange(n as 6 | 12)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                      range === n
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground"
                    }`}
                  >
                    {n}M
                  </button>
                ))}
              </div>
            </div>

            <CashflowChart months={data.months} currency={currency} />
          </div>
        </div>
      </section>

      {/* MoM summary cards */}
      <section className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent this mo</p>
          <p className="mt-1 font-display text-2xl font-bold text-gradient-primary">
            {formatMoney(data.thisMonth, currency)}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
              data.mom > 0 ? "text-destructive" : data.mom < 0 ? "text-success" : "text-muted-foreground"
            }`}
          >
            {data.mom > 0 ? <TrendingUp className="h-3 w-3" /> : data.mom < 0 ? <TrendingDown className="h-3 w-3" /> : null}
            {data.lastMonth === 0 ? "No prior month" : `${data.mom > 0 ? "+" : ""}${data.mom.toFixed(0)}% vs last`}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Income / mo</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatMoney(data.monthlyIncome, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Net {formatMoney(data.monthlyIncome - data.total, currency)} after bills
          </p>
        </div>
      </section>

      {/* Top merchants */}
      {data.topMerchants.length > 0 && (
        <section className="mx-5 mt-4 animate-fade-in-up">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Top merchants</h2>
            <span className="text-[11px] text-muted-foreground">this month</span>
          </div>
          <ul className="flex flex-col gap-2">
            {data.topMerchants.map(([name, info], i) => {
              const max = data.topMerchants[0][1].amount;
              const pct = (info.amount / max) * 100;
              return (
                <li
                  key={name}
                  className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="truncate font-medium text-foreground">{name}</span>
                    <span className="font-display font-bold text-foreground">
                      {formatMoney(info.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-gradient-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {info.count}×
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 6-month forecast */}
      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5 animate-fade-in-up">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">6-month forecast</p>
        <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label="Forecast cashflow for the next six months">
          {data.forecast.map((f, i) => {
            const expPct = (f.expense / forecastAbsMax) * 100;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-primary shadow-glow"
                    style={{ height: `${expPct}%`, minHeight: 2 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
                <span
                  className={`text-[9px] font-semibold ${
                    f.net >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {f.net >= 0 ? "+" : ""}
                  {Math.round(f.net).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Scheduled bills vs projected income. Green = leftover.
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

function CashflowChart({
  months,
  currency,
}: {
  months: { label: string; income: number; spend: number; net: number; key: string }[];
  currency: string;
}) {
  const w = 320;
  const h = 110;
  const pad = 8;
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.spend)));
  const n = months.length;
  const step = (w - pad * 2) / Math.max(1, n - 1);

  const pathFor = (key: "income" | "spend") => {
    return months
      .map((m, i) => {
        const x = pad + i * step;
        const y = h - pad - (m[key] / max) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const areaFor = (key: "income" | "spend") => {
    const top = pathFor(key);
    const lastX = pad + (n - 1) * step;
    return `${top} L ${lastX.toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;
  };

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-32 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Income vs spend over time"
      >
        <defs>
          <linearGradient id="incomeArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spendArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaFor("income")} fill="url(#incomeArea)" />
        <path d={areaFor("spend")} fill="url(#spendArea)" />
        <path d={pathFor("income")} fill="none" stroke="hsl(var(--success))" strokeWidth={2} />
        <path d={pathFor("spend")} fill="none" stroke="hsl(var(--destructive))" strokeWidth={2} />
        {months.map((m, i) => {
          const x = pad + i * step;
          const y = h - pad - (m.spend / max) * (h - pad * 2);
          return (
            <circle
              key={m.key}
              cx={x}
              cy={y}
              r={i === months.length - 1 ? 3 : 1.5}
              fill="hsl(var(--destructive))"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {months.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-success" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-destructive" /> Spend
        </span>
        <span className="ml-auto">Latest: {formatMoney(months.at(-1)?.spend ?? 0, currency)}</span>
      </div>
    </div>
  );
}
