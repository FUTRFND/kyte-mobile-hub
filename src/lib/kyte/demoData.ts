// One-tap demo data seeder. Populates a realistic set of bills, incomes,
// payments, and transactions for the authenticated user. Idempotent: clears
// previous kyte demo rows tagged with `[demo]` in notes before re-inserting.
import { supabase } from "@/integrations/supabase/client";
import { toISODate } from "./bills";

const DEMO_TAG = "[demo]";

type Frequency = "weekly" | "monthly" | "yearly" | "once";

const BILLS: Array<{
  name: string;
  amount: number;
  due_offset_days: number;
  frequency: Frequency;
  category: string;
  color: string;
}> = [
  { name: "Rent — Apartment 4B", amount: 1850, due_offset_days: 3, frequency: "monthly", category: "Housing", color: "#0098FF" },
  { name: "Electric — ConEd", amount: 92.4, due_offset_days: 7, frequency: "monthly", category: "Utilities", color: "#22C55E" },
  { name: "Internet — Verizon Fios", amount: 79.99, due_offset_days: 12, frequency: "monthly", category: "Utilities", color: "#22C55E" },
  { name: "Spotify Family", amount: 16.99, due_offset_days: 5, frequency: "monthly", category: "Subscriptions", color: "#A855F7" },
  { name: "Netflix Premium", amount: 22.99, due_offset_days: 9, frequency: "monthly", category: "Subscriptions", color: "#A855F7" },
  { name: "iCloud+ 200GB", amount: 2.99, due_offset_days: 14, frequency: "monthly", category: "Subscriptions", color: "#A855F7" },
  { name: "Car insurance — Geico", amount: 138, due_offset_days: 18, frequency: "monthly", category: "Insurance", color: "#F97316" },
  { name: "Gym — Equinox", amount: 245, due_offset_days: 22, frequency: "monthly", category: "Health", color: "#14B8A6" },
  { name: "Student loan", amount: 320, due_offset_days: 26, frequency: "monthly", category: "Loans", color: "#EF4444" },
  { name: "Amazon Prime", amount: 139, due_offset_days: 60, frequency: "yearly", category: "Subscriptions", color: "#A855F7" },
];

const INCOMES: Array<{ name: string; amount: number; frequency: Frequency; start_offset_days: number }> = [
  { name: "Salary — Acme Corp", amount: 4200, frequency: "monthly", start_offset_days: -1 },
  { name: "Freelance retainer", amount: 800, frequency: "monthly", start_offset_days: -10 },
];

const TXN_TEMPLATES: Array<{ name: string; amount: number; category: string; daysAgo: number; kind: "expense" | "income" }> = [
  { name: "Whole Foods", amount: -82.47, category: "Food", daysAgo: 1, kind: "expense" },
  { name: "Uber", amount: -18.32, category: "Transport", daysAgo: 1, kind: "expense" },
  { name: "Starbucks", amount: -6.85, category: "Food", daysAgo: 2, kind: "expense" },
  { name: "Shell gas", amount: -54.12, category: "Transport", daysAgo: 3, kind: "expense" },
  { name: "Acme Corp payroll", amount: 2100, category: "Salary", daysAgo: 4, kind: "income" },
  { name: "Trader Joe's", amount: -64.20, category: "Food", daysAgo: 5, kind: "expense" },
  { name: "Apple App Store", amount: -2.99, category: "Subscriptions", daysAgo: 6, kind: "expense" },
  { name: "CVS Pharmacy", amount: -27.43, category: "Health", daysAgo: 7, kind: "expense" },
  { name: "Chipotle", amount: -14.78, category: "Food", daysAgo: 8, kind: "expense" },
  { name: "Lyft", amount: -22.10, category: "Transport", daysAgo: 9, kind: "expense" },
  { name: "Amazon order", amount: -49.99, category: "Other", daysAgo: 10, kind: "expense" },
  { name: "Spotify", amount: -16.99, category: "Subscriptions", daysAgo: 12, kind: "expense" },
  { name: "Freelance — Client A", amount: 800, category: "Freelance", daysAgo: 14, kind: "income" },
  { name: "ConEd Energy", amount: -92.40, category: "Utilities", daysAgo: 16, kind: "expense" },
  { name: "Verizon Fios", amount: -79.99, category: "Utilities", daysAgo: 18, kind: "expense" },
  { name: "Netflix", amount: -22.99, category: "Subscriptions", daysAgo: 20, kind: "expense" },
  { name: "Equinox gym", amount: -245, category: "Health", daysAgo: 22, kind: "expense" },
  { name: "Rent — Apt 4B", amount: -1850, category: "Housing", daysAgo: 25, kind: "expense" },
  { name: "Acme Corp payroll", amount: 2100, category: "Salary", daysAgo: 28, kind: "income" },
  { name: "Target", amount: -73.21, category: "Other", daysAgo: 30, kind: "expense" },
];

export async function seedDemoData(): Promise<{
  bills: number;
  incomes: number;
  transactions: number;
  payments: number;
}> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const userId = u.user.id;

  // Wipe previous demo rows so re-seeding stays clean.
  await supabase.from("bill_payments").delete().eq("user_id", userId);
  await supabase.from("transactions").delete().eq("user_id", userId).like("notes", `%${DEMO_TAG}%`);
  await supabase.from("bills").delete().eq("user_id", userId).like("notes", `%${DEMO_TAG}%`);
  await supabase.from("incomes").delete().eq("user_id", userId).in("name", INCOMES.map((i) => i.name));

  const today = new Date();
  const billRows = BILLS.map((b) => {
    const d = new Date(today);
    d.setDate(d.getDate() + b.due_offset_days - 30); // anchor in last cycle so nextDue lands soon
    return {
      user_id: userId,
      name: b.name,
      amount: b.amount,
      due_date: toISODate(d),
      frequency: b.frequency,
      category: b.category,
      color: b.color,
      notes: DEMO_TAG,
    };
  });
  const { data: insertedBills } = await supabase.from("bills").insert(billRows).select("id, amount, due_date");

  const incomeRows = INCOMES.map((i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i.start_offset_days);
    return {
      user_id: userId,
      name: i.name,
      amount: i.amount,
      frequency: i.frequency,
      start_date: toISODate(d),
    };
  });
  await supabase.from("incomes").insert(incomeRows);

  const txnRows = TXN_TEMPLATES.map((t) => {
    const d = new Date(today);
    d.setDate(d.getDate() - t.daysAgo);
    return {
      user_id: userId,
      name: t.name,
      amount: t.amount,
      kind: t.kind,
      category: t.category,
      occurred_on: toISODate(d),
      notes: DEMO_TAG,
    };
  });
  await supabase.from("transactions").insert(txnRows);

  // Mark a few bills as paid in the current month for "Paid" tile.
  const paidRows: Array<{
    user_id: string;
    bill_id: string;
    amount: number;
    paid_on: string;
    period_date: string;
  }> = [];
  if (insertedBills) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const paidPicks = insertedBills.slice(0, 4);
    for (const b of paidPicks) {
      paidRows.push({
        user_id: userId,
        bill_id: b.id,
        amount: Number(b.amount),
        paid_on: toISODate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 2)),
        period_date: toISODate(monthStart),
      });
    }
    if (paidRows.length) await supabase.from("bill_payments").insert(paidRows);
  }

  return {
    bills: billRows.length,
    incomes: incomeRows.length,
    transactions: txnRows.length,
    payments: paidRows.length,
  };
}
