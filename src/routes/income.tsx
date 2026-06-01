import { createFileRoute } from "@tanstack/react-router";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PageHeader } from "@/components/kyte/PageHeader";
import { formatMoney, frequencyLabel, monthlyEquivalent } from "@/lib/kyte/bills";
import { previewIncomes, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "Income — Kyte" }] }),
  component: IncomePreviewPage,
});

function IncomePreviewPage() {
  const currency = previewProfile.currency;
  const monthly = previewIncomes.reduce((sum, income) => sum + monthlyEquivalent(Number(income.amount), income.frequency), 0);

  return (
    <PreviewAppShell>
      <PageHeader
        title="Income"
        subtitle={`${formatMoney(monthly, currency)} / month`}
        right={
          <button className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Source
          </button>
        }
      />

      <section className="px-5">
        <ul className="flex flex-col gap-2">
          {previewIncomes.map((income) => (
            <li key={income.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <button className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-foreground">{income.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {frequencyLabel(income.frequency)} · {formatMoney(monthlyEquivalent(Number(income.amount), income.frequency), currency)}/mo
                </p>
              </button>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatMoney(Number(income.amount), currency)}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border bg-surface-elevated px-5 py-4 text-sm text-muted-foreground">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          Freelance and recurring pay are normalized into a monthly cashflow view.
        </div>
      </section>
    </PreviewAppShell>
  );
}
