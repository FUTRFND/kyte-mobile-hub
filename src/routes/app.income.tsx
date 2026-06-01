import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { IncomeFormSheet } from "@/components/kyte/IncomeFormSheet";
import { incomesQuery, profileQuery, billsQuery, type Income } from "@/lib/kyte/queries";
import { formatMoney, frequencyLabel, monthlyEquivalent } from "@/lib/kyte/bills";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedMoney } from "@/lib/kyte/animated";

export const Route = createFileRoute("/app/income")({
  head: () => ({ meta: [{ title: "Income — Kyte" }] }),
  component: IncomeTab,
});

function IncomeTab() {
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: profile } = useQuery(profileQuery);
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Income | undefined>();

  const monthly = useMemo(
    () => incomes.reduce((s, i) => s + monthlyEquivalent(Number(i.amount), i.frequency), 0),
    [incomes],
  );
  const billsMonthly = useMemo(
    () => bills.reduce((s, b) => s + monthlyEquivalent(Number(b.amount), b.frequency), 0),
    [bills],
  );
  const leftover = monthly - billsMonthly;
  const ratio = monthly > 0 ? Math.min(1, billsMonthly / monthly) : 0;

  const remove = async (id: string) => {
    if (!confirm("Delete this income?")) return;
    await supabase.from("incomes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["incomes"] });
  };

  return (
    <>
      <PageHeader
        title="Income"
        right={
          <button
            onClick={() => setAdding(true)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Source
          </button>
        }
      />

      {/* Hero card */}
      <section className="mx-5 mb-4 overflow-hidden rounded-3xl border border-border bg-surface-elevated p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Monthly income
            </p>
            <div className="mt-1 font-display text-3xl font-bold text-foreground">
              <AnimatedMoney value={monthly} currency={currency} />
            </div>
          </div>
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground shadow-glow"
            style={{ background: "var(--gradient-hero, hsl(var(--primary)))" }}
          >
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Allocation bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Bills consume {Math.round(ratio * 100)}%</span>
            <span
              className={`font-semibold ${
                leftover >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {leftover >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(leftover), currency)} left
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round(ratio * 100)}%`,
                background:
                  ratio > 0.85
                    ? "hsl(var(--destructive))"
                    : "var(--gradient-hero, hsl(var(--primary)))",
              }}
            />
          </div>
        </div>
      </section>

      <section className="px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Income sources
        </h2>
        {incomes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface shadow-glow">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">No income yet</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Add salary or freelance earnings to see what's left after bills.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-2 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Add income
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {incomes.map((i) => {
              const mo = monthlyEquivalent(Number(i.amount), i.frequency);
              const share = monthly > 0 ? mo / monthly : 0;
              return (
                <li
                  key={i.id}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.99] animate-fade-in-up"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditing(i)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {i.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {frequencyLabel(i.frequency)} · {formatMoney(mo, currency)}/mo
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatMoney(Number(i.amount), currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {Math.round(share * 100)}% of income
                      </p>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground active:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <IncomeFormSheet open={adding} onClose={() => setAdding(false)} />
      <IncomeFormSheet open={!!editing} onClose={() => setEditing(undefined)} income={editing} />
    </>
  );
}
