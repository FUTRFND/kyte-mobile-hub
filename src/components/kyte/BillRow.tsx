import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CATEGORY_COLORS, daysUntil, formatMoney, nextDue, type Bill } from "@/lib/kyte/bills";

export function BillRow({ bill, currency }: { bill: Bill; currency: string }) {
  const due = nextDue(bill);
  const d = daysUntil(due);
  const dueLabel =
    d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : d < 0 ? `${Math.abs(d)}d overdue` : `In ${d}d`;
  const dueColor = d < 0 ? "text-destructive" : d <= 3 ? "text-primary" : "text-muted-foreground";
  const dot = bill.color || CATEGORY_COLORS[bill.category] || "#0098FF";

  return (
    <Link
      to="/app/bill/$id"
      params={{ id: bill.id }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:scale-[0.99] transition"
    >
      <span
        className="h-10 w-10 shrink-0 rounded-xl"
        style={{ backgroundColor: `${dot}22`, border: `1px solid ${dot}55` }}
        aria-hidden
      >
        <span className="block h-full w-full rounded-xl" style={{ backgroundColor: dot, opacity: 0.35 }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{bill.name}</p>
        <p className={`mt-0.5 text-xs font-medium ${dueColor}`}>
          {dueLabel} · {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground">{formatMoney(Number(bill.amount), currency)}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{bill.category}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
