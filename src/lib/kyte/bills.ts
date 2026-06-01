import type { Database } from "@/integrations/supabase/types";

export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type Payment = Database["public"]["Tables"]["bill_payments"]["Row"];
export type Frequency = Database["public"]["Enums"]["bill_frequency"];

export const CATEGORIES = [
  "Housing",
  "Utilities",
  "Subscriptions",
  "Insurance",
  "Transport",
  "Food",
  "Health",
  "Loans",
  "Other",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: "#0098FF",
  Utilities: "#22C55E",
  Subscriptions: "#A855F7",
  Insurance: "#F97316",
  Transport: "#EAB308",
  Food: "#EC4899",
  Health: "#14B8A6",
  Loans: "#EF4444",
  Other: "#94A3B8",
};

export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nextDue(bill: Pick<Bill, "due_date" | "frequency">, from = new Date()): Date {
  const start = parseDate(bill.due_date);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (bill.frequency === "once") return start;
  const d = new Date(start);
  const guard = 600;
  let i = 0;
  while (d < today && i < guard) {
    if (bill.frequency === "weekly") d.setDate(d.getDate() + 7);
    else if (bill.frequency === "monthly") d.setMonth(d.getMonth() + 1);
    else if (bill.frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    i++;
  }
  return d;
}

export function occurrencesInRange(
  bill: Pick<Bill, "due_date" | "frequency">,
  start: Date,
  end: Date,
): Date[] {
  const out: Date[] = [];
  const first = parseDate(bill.due_date);
  if (bill.frequency === "once") {
    if (first >= start && first <= end) out.push(first);
    return out;
  }
  const cursor = new Date(first);
  const guard = 1200;
  let i = 0;
  while (cursor < start && i < guard) {
    if (bill.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
    else if (bill.frequency === "monthly") cursor.setMonth(cursor.getMonth() + 1);
    else if (bill.frequency === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
    i++;
  }
  i = 0;
  while (cursor <= end && i < guard) {
    if (cursor >= start) out.push(new Date(cursor));
    if (bill.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
    else if (bill.frequency === "monthly") cursor.setMonth(cursor.getMonth() + 1);
    else if (bill.frequency === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
    i++;
  }
  return out;
}

export function daysUntil(date: Date, from = new Date()): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function frequencyLabel(f: Frequency) {
  return { once: "One-time", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[f];
}

/** Normalize any frequency into a monthly equivalent amount. */
export function monthlyEquivalent(amount: number, freq: Frequency): number {
  switch (freq) {
    case "weekly":
      return amount * 4.345;
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "once":
      return 0; // not a recurring contribution
  }
}
