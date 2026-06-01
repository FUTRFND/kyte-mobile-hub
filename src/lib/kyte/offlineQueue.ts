// Offline mark-paid queue. Stores pending mark-paid mutations in localStorage
// and flushes them whenever the user comes back online. Designed for the
// Capacitor app — but works in the web preview too.

import { supabase } from "@/integrations/supabase/client";

const KEY = "kyte:pendingMarkPaid:v1";

export type PendingMarkPaid = {
  id: string;            // local id for dedupe
  user_id: string;
  bill_id: string;
  amount: number;
  paid_on: string;       // ISO date
  period_date: string;   // ISO date
  // Optional metadata used to auto-post a matching expense transaction
  // once the queued payment is flushed online.
  bill_name?: string;
  bill_category?: string;
  queuedAt: number;
};

function read(): PendingMarkPaid[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as PendingMarkPaid[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingMarkPaid[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota — ignore */
  }
}

export function pendingCount(): number {
  return read().length;
}

export async function enqueueMarkPaid(
  entry: Omit<PendingMarkPaid, "id" | "queuedAt">,
): Promise<void> {
  const items = read();
  items.push({ ...entry, id: crypto.randomUUID(), queuedAt: Date.now() });
  write(items);
}

export async function flushPending(): Promise<{ flushed: number; failed: number }> {
  const items = read();
  if (items.length === 0) return { flushed: 0, failed: 0 };
  const remaining: PendingMarkPaid[] = [];
  let flushed = 0;
  for (const it of items) {
    const { error } = await supabase.from("bill_payments").insert({
      user_id: it.user_id,
      bill_id: it.bill_id,
      amount: it.amount,
      paid_on: it.paid_on,
      period_date: it.period_date,
    });
    if (error) {
      remaining.push(it);
    } else {
      flushed++;
      // Auto-post a matching expense transaction.
      if (it.bill_name) {
        await supabase.from("transactions").insert({
          user_id: it.user_id,
          name: it.bill_name,
          amount: it.amount,
          kind: "expense",
          category: it.bill_category ?? "Other",
          occurred_on: it.paid_on,
          notes: `Bill payment · ${it.bill_name}`,
        });
      }
    }
  }
  write(remaining);
  return { flushed, failed: remaining.length };
}

let installed = false;
export function installOfflineQueue() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("online", () => {
    void flushPending();
  });
  // Try once on install in case we came back online before listeners.
  if (navigator.onLine) void flushPending();
}
