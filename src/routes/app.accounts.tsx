import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Landmark, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accountsQuery } from "@/lib/kyte/queries";

export const Route = createFileRoute("/app/accounts")({
  head: () => ({ meta: [{ title: "Linked accounts — Kyte" }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery(accountsQuery);
  const [connecting, setConnecting] = useState(false);

  const startTellerConnect = async () => {
    setConnecting(true);
    try {
      // Skeleton — when TELLER_APP_ID is provided, this will open the Teller
      // Connect SDK and POST the enrollment to the `teller-exchange` server fn.
      // Until then we no-op with a friendly notice.
      alert(
        "Teller integration is wired but disabled.\n\nAdd TELLER_APP_ID, TELLER_CERT, TELLER_CERT_KEY, and TELLER_SIGNING_SECRET in Settings → Secrets, and the Connect button will open the live Teller flow.",
      );
    } finally {
      setConnecting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Disconnect this account? This purges its bills and payments.")) return;
    // TODO (sprint-2): call account-delete server fn to revoke Teller enrollment first.
    await supabase.from("accounts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => nav({ to: "/app/settings" })}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">Linked accounts</h1>
      </header>

      <section className="mx-5 mt-4 rounded-3xl border border-border bg-surface-elevated p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-foreground">Connect with Teller</p>
            <p className="text-xs text-muted-foreground">
              Link a bank or credit card to import balances and statements automatically.
            </p>
          </div>
        </div>
        <button
          onClick={startTellerConnect}
          disabled={connecting}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {connecting ? "Opening…" : "Connect a bank"}
        </button>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Your linked accounts
        </h2>
        {accounts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No accounts linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {a.institution ?? "Linked account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.mask ? `••••${a.mask}` : a.provider} · {a.status}
                  </p>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive"
                  aria-label="Disconnect"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mx-5 mt-8 rounded-2xl border border-border bg-surface/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Per spec v2, Teller access tokens are stored encrypted on the server and never returned to
        the client. The exchange + hourly sync run server-side.
      </p>

      <div className="h-10" />
    </>
  );
}
