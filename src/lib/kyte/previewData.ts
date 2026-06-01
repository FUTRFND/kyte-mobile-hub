import type { Bill, Payment } from "./bills";
import type { Account, Income, Profile, Transaction } from "./queries";
import { toISODate } from "./bills";

const now = new Date();
const stamp = now.toISOString();
const userId = "preview-user";

function dateFor(day: number, monthOffset = 0) {
  return toISODate(new Date(now.getFullYear(), now.getMonth() + monthOffset, day));
}

function daysAgo(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return toISODate(d);
}

function daysAhead(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export const previewProfile: Profile = {
  id: "profile-preview",
  user_id: userId,
  avatar_url: null,
  biometric_enabled: true,
  created_at: stamp,
  currency: "USD",
  display_name: "Maya",
  monthly_budget: 2600,
  pay_requires_biometric: false,
  quiet_hours_end: 7,
  quiet_hours_start: 22,
  reminder_channels: ["push", "email"],
  reminder_days_array: [7, 3, 1],
  reminder_days_default: 3,
  smart_timing: true,
  updated_at: stamp,
};

export const previewBills: Bill[] = [
  {
    id: "bill-rent",
    user_id: userId,
    name: "Rent",
    amount: 1650,
    category: "Housing",
    color: "#0098FF",
    due_date: dateFor(1),
    frequency: "monthly",
    is_archived: false,
    notes: "Paid through resident portal.",
    reminder_days: 7,
    snoozed_until: null,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "bill-power",
    user_id: userId,
    name: "Power",
    amount: 118,
    category: "Utilities",
    color: "#22C55E",
    due_date: dateFor(6),
    frequency: "monthly",
    is_archived: false,
    notes: "Average billing enabled.",
    reminder_days: 3,
    snoozed_until: null,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "bill-phone",
    user_id: userId,
    name: "Phone",
    amount: 86,
    category: "Utilities",
    color: "#14B8A6",
    due_date: dateFor(11),
    frequency: "monthly",
    is_archived: false,
    notes: null,
    reminder_days: 3,
    snoozed_until: null,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "bill-netflix",
    user_id: userId,
    name: "Netflix",
    amount: 19.99,
    category: "Subscriptions",
    color: "#A855F7",
    due_date: dateFor(18),
    frequency: "monthly",
    is_archived: false,
    notes: null,
    reminder_days: 1,
    snoozed_until: null,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "bill-gym",
    user_id: userId,
    name: "Gym",
    amount: 54,
    category: "Health",
    color: "#EC4899",
    due_date: dateFor(24),
    frequency: "monthly",
    is_archived: false,
    notes: null,
    reminder_days: 1,
    snoozed_until: daysAhead(2),
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "bill-insurance",
    user_id: userId,
    name: "Car insurance",
    amount: 720,
    category: "Insurance",
    color: "#F97316",
    due_date: dateFor(28),
    frequency: "yearly",
    is_archived: false,
    notes: "Annual premium.",
    reminder_days: 14,
    snoozed_until: null,
    created_at: stamp,
    updated_at: stamp,
  },
];

export const previewPayments: Payment[] = [
  {
    id: "pay-rent-last",
    user_id: userId,
    bill_id: "bill-rent",
    amount: 1650,
    paid_on: dateFor(1, -1),
    period_date: dateFor(1, -1),
    created_at: stamp,
  },
  {
    id: "pay-power-last",
    user_id: userId,
    bill_id: "bill-power",
    amount: 118,
    paid_on: dateFor(6, -1),
    period_date: dateFor(6, -1),
    created_at: stamp,
  },
  {
    id: "pay-phone-last",
    user_id: userId,
    bill_id: "bill-phone",
    amount: 86,
    paid_on: dateFor(11, -1),
    period_date: dateFor(11, -1),
    created_at: stamp,
  },
  {
    id: "pay-netflix-last",
    user_id: userId,
    bill_id: "bill-netflix",
    amount: 19.99,
    paid_on: dateFor(18, -1),
    period_date: dateFor(18, -1),
    created_at: stamp,
  },
  {
    id: "pay-gym-last",
    user_id: userId,
    bill_id: "bill-gym",
    amount: 54,
    paid_on: dateFor(24, -1),
    period_date: dateFor(24, -1),
    created_at: stamp,
  },
  {
    id: "pay-rent-current",
    user_id: userId,
    bill_id: "bill-rent",
    amount: 1650,
    paid_on: dateFor(1),
    period_date: dateFor(1),
    created_at: stamp,
  },
];

export const previewIncomes: Income[] = [
  {
    id: "income-salary",
    user_id: userId,
    name: "Salary",
    amount: 4200,
    frequency: "monthly",
    is_archived: false,
    start_date: dateFor(1, -6),
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "income-freelance",
    user_id: userId,
    name: "Freelance design",
    amount: 380,
    frequency: "weekly",
    is_archived: false,
    start_date: dateFor(3, -2),
    created_at: stamp,
    updated_at: stamp,
  },
];

export const previewTransactions: Transaction[] = [
  {
    id: "txn-groceries",
    user_id: userId,
    name: "Groceries",
    amount: 92.4,
    kind: "expense",
    category: "Food",
    notes: "Weekly shop",
    occurred_on: daysAgo(2),
    created_at: stamp,
  },
  {
    id: "txn-fuel",
    user_id: userId,
    name: "Fuel",
    amount: 48.15,
    kind: "expense",
    category: "Transport",
    notes: null,
    occurred_on: daysAgo(4),
    created_at: stamp,
  },
  {
    id: "txn-paycheck",
    user_id: userId,
    name: "Mid-month paycheck",
    amount: 2100,
    kind: "income",
    category: "Income",
    notes: null,
    occurred_on: daysAgo(12),
    created_at: stamp,
  },
  {
    id: "txn-dinner",
    user_id: userId,
    name: "Dinner out",
    amount: 64,
    kind: "expense",
    category: "Food",
    notes: null,
    occurred_on: daysAgo(7),
    created_at: stamp,
  },
];

export const previewAccounts: Account[] = [
  {
    id: "account-checking",
    user_id: userId,
    provider: "teller",
    institution: "Chase Checking",
    mask: "4821",
    status: "active",
    access_token_encrypted: null,
    linked_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "account-card",
    user_id: userId,
    provider: "teller",
    institution: "Amex Gold",
    mask: "1008",
    status: "active",
    access_token_encrypted: null,
    linked_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  },
];

export function getPreviewBill(id: string) {
  return previewBills.find((bill) => bill.id === id) ?? null;
}
