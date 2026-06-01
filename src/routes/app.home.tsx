import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Wallet, Sparkles, TrendingDown, TrendingUp, ArrowRight, Landmark } from "lucide-react";
import { BillRow } from "@/components/kyte/BillRow";
import { BillFormSheet } from "@/components/kyte/BillFormSheet";
import {
  accountsQuery,
  billsQuery,
  incomesQuery,
  paymentsQuery,
  profileQuery,
  transactionsQuery,
} from "@/lib/kyte/queries";
import {
  formatMoney,
  monthlyEquivalent,
  nextDue,
  occurrencesInRange,
} from "@/lib/kyte/bills";
import { AnimatedMoney, Sparkline } from "@/lib/kyte/animated";
import { SmartBillSuggestions } from "@/components/kyte/SmartBillSuggestions";

export const Route = createFileRoute("/app/home")({
  head: () => ({ meta: [{ title: "Home — Kyte" }] }),
  component: HomeTab,
});

function HomeTab() {
  const { data: bills = [], isLoading } = useQuery(billsQuery);
  const { data: profile } = useQuery(profileQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: accounts = [] } = useQuery(accountsQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);
  const [adding, setAdding] = useState(false);
  const currency = profile?.currency ?? "USD";

  const m = useMemo(() => {
    const sorted = [...bills].sort((a, b) => nextDue(a).getTime() - nextDue(b).getTime());
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthSum = bills.reduce(
      (s, b) => s + occurrencesInRange(b, monthStart, monthEnd).length * Number(b.amount),
      0,
    );
    const paid = payments
      .filter((p) => {
        const d = new Date(p.paid_on);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, p) => s + Number(p.amount), 0);

    const monthlyIncome = incomes.reduce(
      (s, i) => s + monthlyEquivalent(Number(i.amount), i.frequency),
      0,
    );

    // Connected balance (sum of available balances from linked accounts).
    const liquid = accounts.reduce(
      (s, a) => s + Number(a.balance_available ?? a.balance_ledger ?? 0),
      0,
    );

    // Trailing 6-month spend for sparkline.
    const spark: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = d;
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const sum = txns
        .filter((t) => {
          const dd = new Date(t.occurred_on);
          return dd >= mStart && dd <= mEnd && Number(t.amount) < 0;
        })
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      spark.push(sum);
    }

    // Insight: this week's outflow vs last week's.
    const dayMs = 86_400_000;
    const sumRange = (from: Date, to: Date) =>
      txns
        .filter((t) => {
          const dd = new Date(t.occurred_on);
          return dd >= from && dd <= to && Number(t.amount) < 0;
        })
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const thisWeek = sumRange(new Date(now.getTime() - 7 * dayMs), now);
    const lastWeek = sumRange(new Date(now.getTime() - 14 * dayMs), new Date(now.getTime() - 7 * dayMs));
    const weekDelta = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    const remaining = Math.max(0, monthSum - paid);
    return {
      upcoming: sorted,
      monthTotal: monthSum,
      paidThisMonth: paid,
      remainingThisMonth: remaining,
      monthlyIncome,
      liquid,
      spark,
      thisWeek,
      lastWeek,
      weekDelta,
      progress: monthSum > 0 ? Math.min(1, paid / monthSum) : 0,
    };
  }, [bills, payments, incomes, accounts, txns]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <>
      {/* Header */}
      <header className="flex items-end justify-between px-5 pt-6 pb-3 animate-fade-in">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{greeting}</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {firstName ? `${firstName}.` : "Welcome back."}
          </h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          aria-label="Add bill"
          className="flex h-11 items-center gap-1.5 rounded-full bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Bill
        </button>
      </header>

      {/* Hero balance card */}
      <section className="mx-5 animate-fade-in-up">
        <div className="card-premium glow-ring relative p-5">
          {/* mesh glow */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-80" aria-hidden />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {m.liquid > 0 ? "Available balance" : "Bills this month"}
                </p>
                <AnimatedMoney
                  value={m.liquid > 0 ? m.liquid : m.monthTotal}
                  currency={currency}
                  className="mt-1.5 block font-display text-[40px] font-bold leading-none text-foreground"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {m.liquid > 0 ? (
                    <>across {accounts.length} linked {accounts.length === 1 ? "account" : "accounts"}</>
                  ) : (
                    <>{formatMoney(m.remainingThisMonth, currency)} still due</>
                  )}
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary animate-pulse-glow">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            {/* Sparkline of spend */}
            {m.spark.some((v) => v > 0) && (
              <div className="-mx-2 mt-3">
                <Sparkline values={m.spark} height={48} />
                <div className="mt-1 flex justify-between px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>6mo spend</span>
                  <span>{formatMoney(m.spark.at(-1) ?? 0, currency)} this mo</span>
                </div>
              </div>
            )}

            {/* Progress bar — paid vs scheduled */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>Bills paid</span>
                <span className="text-foreground/80">
                  {formatMoney(m.paidThisMonth, currency)} / {formatMoney(m.monthTotal, currency)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background/80">
                <div
                  className="h-full rounded-full bg-gradient-success transition-all duration-700"
                  style={{ width: `${m.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart insight chip */}
      {(m.thisWeek > 0 || m.lastWeek > 0) && (
        <section className="mx-5 mt-3 animate-fade-in-up">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                m.weekDelta > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
              }`}
            >
              {m.weekDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {m.weekDelta > 0
                  ? `Spending is up ${Math.round(Math.abs(m.weekDelta))}% this week`
                  : m.weekDelta < 0
                    ? `Nice — spending is down ${Math.round(Math.abs(m.weekDelta))}% this week`
                    : "Steady week so far"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatMoney(m.thisWeek, currency)} in the last 7 days
              </p>
            </div>
            <Link
              to="/app/insights"
              aria-label="See insights"
              className="grid h-8 w-8 place-items-center rounded-full bg-surface-elevated text-muted-foreground"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Accounts strip */}
      {accounts.length > 0 && (
        <section className="mt-5 animate-fade-in-up">
          <div className="mb-2 flex items-center justify-between px-5">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Accounts</h2>
            <Link to="/app/accounts" className="text-xs font-semibold text-primary">
              Manage
            </Link>
          </div>
          <ul className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
            {accounts.map((a) => {
              const bal = Number(a.balance_available ?? a.balance_ledger ?? 0);
              return (
                <li
                  key={a.id}
                  className="card-premium relative min-w-[180px] shrink-0 p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
                      <Landmark className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate text-[11px] font-medium text-muted-foreground">
                      {a.institution ?? a.name ?? "Bank"}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-display text-lg font-bold text-foreground">
                    {formatMoney(bal, a.currency ?? currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.name}{a.mask ? ` · ••${a.mask}` : ""}
                  </p>
                </li>
              );
            })}
            <li>
              <Link
                to="/app/accounts"
                className="flex h-full min-w-[140px] shrink-0 items-center justify-center rounded-3xl border border-dashed border-border bg-surface/40 px-4 text-xs font-semibold text-muted-foreground"
              >
                + Link a bank
              </Link>
            </li>
          </ul>
        </section>
      )}

      {/* Upcoming bills */}
      <section className="mt-6 px-5 pb-6 animate-fade-in-up">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Upcoming</h2>
          {m.upcoming.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {m.upcoming.length} {m.upcoming.length === 1 ? "bill" : "bills"}
            </span>
          )}
        </div>

        {isLoading ? (
          <SkeletonList />
        ) : m.upcoming.length === 0 ? (
          <Empty onAdd={() => setAdding(true)} />
        ) : (
          <ul className="flex flex-col gap-2">
            {m.upcoming.slice(0, 8).map((b, i) => (
              <li
                key={b.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
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

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-gradient-to-r from-surface via-surface-elevated to-surface bg-[length:200%_100%]"
          style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
        />
      ))}
    </ul>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card-premium glow-ring relative flex flex-col items-center gap-3 overflow-hidden px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" aria-hidden />
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary animate-pulse-glow">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="relative font-display text-base font-bold text-foreground">No bills yet</h3>
      <p className="relative max-w-xs text-sm text-muted-foreground">
        Track rent, subscriptions, utilities — anything that comes back.
      </p>
      <button
        onClick={onAdd}
        className="relative mt-2 h-11 rounded-full bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        Add your first bill
      </button>
    </div>
  );
}
