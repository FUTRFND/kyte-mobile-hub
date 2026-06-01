import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Landmark, Plus, Trash2 } from "lucide-react";
import { previewAccounts } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Linked accounts — Kyte" }] }),
  component: AccountsPreviewPage,
});

function AccountsPreviewPage() {
  return (
    <div className="min-h-dvh bg-background safe-top">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-xl font-bold text-foreground">Linked accounts</h1>
      </header>

      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-foreground">Connect with Teller</p>
            <p className="text-xs text-muted-foreground">Link a bank or credit card to import balances and statements automatically.</p>
          </div>
        </div>
        <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Connect a bank
        </button>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your linked accounts</h2>
        <ul className="flex flex-col gap-2">
          {previewAccounts.map((account) => (
            <li key={account.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{account.institution}</p>
                <p className="text-xs text-muted-foreground">••••{account.mask} · {account.status}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive" aria-label="Disconnect">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="mx-5 mt-8 rounded-2xl border border-border bg-surface/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Teller access keys are still pending; this preview shows the linked-accounts skeleton and account list state.
      </p>
    </div>
  );
}
