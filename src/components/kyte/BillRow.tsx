import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Check, Clock } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_COLORS,
  daysUntil,
  formatMoney,
  nextDue,
  parseDate,
  toISODate,
  type Bill,
} from "@/lib/kyte/bills";
import { enqueueMarkPaid, flushPending } from "@/lib/kyte/offlineQueue";

const SWIPE_THRESHOLD = 80;
const SWIPE_LIMIT = 110;

export function BillRow({ bill, currency }: { bill: Bill; currency: string }) {
  const qc = useQueryClient();
  const due = nextDue(bill);
  const snoozed = bill.snoozed_until ? parseDate(bill.snoozed_until) : null;
  const d = daysUntil(due);
  const dueLabel = snoozed && snoozed > new Date()
    ? `Snoozed → ${snoozed.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : d < 0 ? `${Math.abs(d)}d overdue` : `In ${d}d`;
  const dueColor = snoozed && snoozed > new Date()
    ? "text-muted-foreground"
    : d < 0 ? "text-destructive" : d <= 3 ? "text-primary" : "text-muted-foreground";
  const dot = bill.color || CATEGORY_COLORS[bill.category] || "#0098FF";

  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);

  const reset = () => {
    startX.current = null;
    setDx(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.touches[0].clientX - startX.current;
    setDx(Math.max(-SWIPE_LIMIT, Math.min(SWIPE_LIMIT, delta)));
  };
  const onTouchEnd = async () => {
    const delta = dx;
    reset();
    if (delta > SWIPE_THRESHOLD) await markPaid();
    else if (delta < -SWIPE_THRESHOLD) await snooze();
  };

  const markPaid = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const entry = {
      user_id: u.user.id,
      bill_id: bill.id,
      amount: Number(bill.amount),
      paid_on: toISODate(new Date()),
      period_date: toISODate(due),
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueMarkPaid(entry);
    } else {
      const { error } = await supabase.from("bill_payments").insert(entry);
      if (error) await enqueueMarkPaid(entry);
    }
    await flushPending();
    qc.invalidateQueries({ queryKey: ["payments"] });
  };

  const snooze = async () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    await supabase.from("bills").update({ snoozed_until: toISODate(next) }).eq("id", bill.id);
    qc.invalidateQueries({ queryKey: ["bills"] });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Underlay actions */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5">
        <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-success transition-opacity ${dx > 20 ? "opacity-100" : "opacity-0"}`}>
          <Check className="h-4 w-4" /> Paid
        </span>
        <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary transition-opacity ${dx < -20 ? "opacity-100" : "opacity-0"}`}>
          Snooze 1d <Clock className="h-4 w-4" />
        </span>
      </div>

      <Link
        to="/app/bill/$id"
        params={{ id: bill.id }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={reset}
        style={{ transform: `translateX(${dx}px)` }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-transform active:scale-[0.99]"
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
    </div>
  );
}
