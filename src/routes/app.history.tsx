import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Download, Trash2, Search, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { TransactionFormSheet } from "@/components/kyte/TransactionFormSheet";
import {
  billsQuery,
  paymentsQuery,
  profileQuery,
  transactionsQuery,
  type Transaction,
} from "@/lib/kyte/queries";
import { CATEGORY_COLORS, formatMoney } from "@/lib/kyte/bills";
import { downloadFile, toCSV } from "@/lib/kyte/export";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedMoney } from "@/lib/kyte/animated";

type Entry = {
  id: string;
  date: string;
  name: string;
  amount: number;
  kind: "expense" | "income";
  category: string;
  source: "bill" | "txn";
};

export const Route = createFileRoute("/app/history")({
  head: () => ({ meta: [{ title: "History — Kyte" }] }),
  component: HistoryTab,
});

function HistoryTab() {
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);
  const { data: profile } = useQuery(profileQuery);
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();

  const entries = useMemo<Entry[]>(() => {
    const billMap = new Map(bills.map((b) => [b.id, b]));
    const billEntries: Entry[] = payments.map((p) => {
      const b = billMap.get(p.bill_id);
      return {
        id: `p:${p.id}`,
        date: p.paid_on,
        name: b?.name ?? "Bill payment",
        amount: Number(p.amount),
        kind: "expense",
        category: b?.category ?? "Other",
        source: "bill",
      };
    });
    const txnEntries: Entry[] = txns.map((t) => ({
      id: `t:${t.id}`,
      date: t.occurred_on,
      name: t.name,
      amount: Number(t.amount),
      kind: t.kind,
      category: t.category,
      source: "txn",
    }));
    let all = [...billEntries, ...txnEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (filter !== "all") all = all.filter((e) => e.kind === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      all = all.filter(
        (e) => e.name.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle),
      );
    }
    return all;
  }, [bills, payments, txns, q, filter]);

  const totals = useMemo(() => {
    const inc = entries.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0);
    const exp = entries.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0);
    return { inc, exp, net: inc - exp };
  }, [entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [entries]);

  const exportCsv = () => {
    const csv = toCSV(entries, ["date", "name", "kind", "category", "amount", "source"]);
    downloadFile(`kyte-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const removeTxn = async (entry: Entry) => {
    if (entry.source !== "txn") return;
    if (!confirm("Delete this entry?")) return;
    const id = entry.id.replace(/^t:/, "");
    await supabase.from("transactions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  const editTxn = (entry: Entry) => {
    if (entry.source !== "txn") return;
    const id = entry.id.replace(/^t:/, "");
    const t = txns.find((x) => x.id === id);
    if (t) setEditing(t);
  };

  const niceDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (toISO(d) === toISO(today)) return "Today";
    if (toISO(d) === toISO(yest)) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <>
      <PageHeader
        title="History"
        right={
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-foreground transition active:scale-95"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAdding(true)}
              className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Entry
            </button>
          </div>
        }
      />

      {/* Hero net card */}
      <section className="mx-5 mb-3 overflow-hidden rounded-3xl border border-border bg-surface-elevated p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Net flow</p>
        <div
          className={`mt-1 font-display text-3xl font-bold ${
            totals.net >= 0 ? "text-primary" : "text-destructive"
          }`}
        >
          {totals.net >= 0 ? "+" : "−"}
          <AnimatedMoney value={Math.abs(totals.net)} currency={currency} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-primary" /> In
            </div>
            <p className="mt-1 font-display text-base font-bold text-foreground">
              {formatMoney(totals.inc, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-destructive" /> Out
            </div>
            <p className="mt-1 font-display text-base font-bold text-foreground">
              {formatMoney(totals.exp, currency)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-surface px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mb-4 flex gap-2">
          {(["all", "expense", "income"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize transition active:scale-95 ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-surface text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No matching entries.
          </p>
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {grouped.map(([date, list]) => {
              const dayNet = list.reduce(
                (s, e) => s + (e.kind === "income" ? e.amount : -e.amount),
                0,
              );
              return (
                <div key={date} className="animate-fade-in-up">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {niceDate(date)}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        dayNet >= 0 ? "text-primary" : "text-foreground/70"
                      }`}
                    >
                      {dayNet >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(dayNet), currency)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {list.map((e) => {
                      const color = CATEGORY_COLORS[e.category] ?? "#0098FF";
                      return (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.99]"
                        >
                          <button
                            onClick={() => editTxn(e)}
                            disabled={e.source !== "txn"}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                          >
                            <span
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-bold"
                              style={{
                                background: `${color}22`,
                                border: `1px solid ${color}55`,
                                color,
                              }}
                            >
                              {e.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {e.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {e.category}
                                {e.source === "bill" ? " · Bill" : ""}
                              </p>
                            </div>
                          </button>
                          <p
                            className={`text-sm font-bold ${
                              e.kind === "income" ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {e.kind === "income" ? "+" : "−"}
                            {formatMoney(e.amount, currency)}
                          </p>
                          {e.source === "txn" && (
                            <button
                              onClick={() => removeTxn(e)}
                              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground active:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TransactionFormSheet open={adding} onClose={() => setAdding(false)} />
      <TransactionFormSheet open={!!editing} onClose={() => setEditing(undefined)} txn={editing} />
    </>
  );
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
