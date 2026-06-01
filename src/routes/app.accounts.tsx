import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Landmark, Plus, RefreshCw, Trash2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accountsQuery } from "@/lib/kyte/queries";
import { openTellerConnect, type TellerEnrollment } from "@/lib/kyte/tellerConnect";

const TELLER_APP_ID = "app_pt12nf29f87r7go454000";
const TELLER_ENV = "sandbox" as const;

export const Route = createFileRoute("/app/accounts")({
  head: () => ({ meta: [{ title: "Linked accounts — Kyte" }] }),
  component: AccountsPage,
});

async function callFn<T>(name: string, init: RequestInit = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

function AccountsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery(accountsQuery);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTxnsFor, setOpenTxnsFor] = useState<string | null>(null);

  const refreshBalances = useMutation({
    mutationFn: () => callFn("teller-balances", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const startTellerConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      await openTellerConnect({
        applicationId: TELLER_APP_ID,
        environment: TELLER_ENV,
        onSuccess: async (enrollment: TellerEnrollment) => {
          try {
            await callFn("teller-exchange", {
              method: "POST",
              body: JSON.stringify({
                accessToken: enrollment.accessToken,
                enrollment: enrollment.enrollment,
              }),
            });
            qc.invalidateQueries({ queryKey: ["accounts"] });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setConnecting(false);
          }
        },
        onExit: () => setConnecting(false),
        onFailure: (f) => {
          setError(typeof f === "string" ? f : "Teller Connect failed");
          setConnecting(false);
        },
      });
    } catch (e) {
      setError((e as Error).message);
      setConnecting(false);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm("Disconnect this bank? Stored balances and links will be removed.")) return;
    try {
      await callFn("teller-disconnect", {
        method: "POST",
        body: JSON.stringify({ accountId: id }),
      });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      setError((e as Error).message);
    }
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
              Sandbox mode — link a test bank to import balances and transactions.
            </p>
          </div>
        </div>
        <button
          onClick={startTellerConnect}
          disabled={connecting}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {connecting ? "Opening Teller…" : "Connect a bank"}
        </button>
        {error && (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </section>

      <section className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            Your linked accounts
          </h2>
          {accounts.length > 0 && (
            <button
              onClick={() => refreshBalances.mutate()}
              disabled={refreshBalances.isPending}
              className="flex items-center gap-1 text-xs text-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshBalances.isPending ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : accounts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No accounts linked yet. Tap “Connect a bank” to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accounts.map((a) => {
              const bal = a.balance_available ?? a.balance_ledger;
              return (
                <li
                  key={a.id}
                  className="rounded-2xl border border-border bg-surface"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {a.name ?? a.institution ?? "Linked account"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.institution ?? a.provider}
                        {a.mask ? ` · ••••${a.mask}` : ""}
                        {a.status !== "active" ? ` · ${a.status}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {bal != null
                          ? new Intl.NumberFormat(undefined, {
                              style: "currency",
                              currency: a.currency ?? "USD",
                            }).format(Number(bal))
                          : "—"}
                      </p>
                      <button
                        onClick={() =>
                          setOpenTxnsFor((prev) => (prev === a.id ? null : a.id))
                        }
                        className="mt-1 inline-flex items-center text-[11px] text-primary"
                      >
                        {openTxnsFor === a.id ? "Hide" : "View txns"}
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${
                            openTxnsFor === a.id ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <button
                      onClick={() => disconnect(a.id)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive"
                      aria-label="Disconnect"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {openTxnsFor === a.id && <TransactionList accountId={a.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mx-5 mt-8 rounded-2xl border border-border bg-surface/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Teller access tokens are stored on the server. Sandbox/dev mode — production access
        and at-rest encryption (pgsodium/KMS) ship before launch.
      </p>

      <div className="h-10" />
    </>
  );
}

type TellerTxn = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
};

function TransactionList({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teller-txns", accountId],
    queryFn: async () => {
      return await callFn<{ transactions: TellerTxn[] }>(
        `teller-transactions?account_id=${accountId}&limit=10`,
      );
    },
  });

  if (isLoading) {
    return <p className="px-4 pb-4 text-xs text-muted-foreground">Loading transactions…</p>;
  }
  if (error) {
    return (
      <p className="px-4 pb-4 text-xs text-destructive">
        {(error as Error).message}
      </p>
    );
  }
  const txns = data?.transactions ?? [];
  if (txns.length === 0) {
    return <p className="px-4 pb-4 text-xs text-muted-foreground">No recent transactions.</p>;
  }
  return (
    <ul className="border-t border-border px-4 py-2">
      {txns.map((t) => (
        <li key={t.id} className="flex items-center justify-between py-1.5 text-xs">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{t.description}</p>
            <p className="text-[10px] text-muted-foreground">{t.date}</p>
          </div>
          <p
            className={`ml-3 shrink-0 font-semibold ${
              t.amount < 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "USD",
            }).format(t.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
