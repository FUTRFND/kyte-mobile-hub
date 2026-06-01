import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { IncomeFormSheet } from "@/components/kyte/IncomeFormSheet";
import { incomesQuery, profileQuery, type Income } from "@/lib/kyte/queries";
import { formatMoney, frequencyLabel, monthlyEquivalent } from "@/lib/kyte/bills";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/income")({
  head: () => ({ meta: [{ title: "Income — Kyte" }] }),
  component: IncomeTab,
});

function IncomeTab() {
  const { data: incomes = [] } = useQuery(incomesQuery);
  const { data: profile } = useQuery(profileQuery);
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Income | undefined>();

  const monthly = incomes.reduce((s, i) => s + monthlyEquivalent(Number(i.amount), i.frequency), 0);

  const remove = async (id: string) => {
    if (!confirm("Delete this income?")) return;
    await supabase.from("incomes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["incomes"] });
  };

  return (
    <>
      <PageHeader
        title="Income"
        subtitle={`${formatMoney(monthly, currency)} / month`}
        right={
          <button
            onClick={() => setAdding(true)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
          >
            <Plus className="h-4 w-4" /> Source
          </button>
        }
      />

      <section className="px-5">
        {incomes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">No income yet</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Add salary or freelance earnings to see what's left after bills.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-2 h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Add income
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {incomes.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <button
                  onClick={() => setEditing(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {frequencyLabel(i.frequency)} ·{" "}
                    {formatMoney(monthlyEquivalent(Number(i.amount), i.frequency), currency)}/mo
                  </p>
                </button>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatMoney(Number(i.amount), currency)}
                  </p>
                </div>
                <button
                  onClick={() => remove(i.id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground active:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <IncomeFormSheet open={adding} onClose={() => setAdding(false)} />
      <IncomeFormSheet open={!!editing} onClose={() => setEditing(undefined)} income={editing} />
    </>
  );
}
