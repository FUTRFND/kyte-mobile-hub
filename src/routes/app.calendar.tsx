import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { BillRow } from "@/components/kyte/BillRow";
import { billsQuery, profileQuery } from "@/lib/kyte/queries";
import { formatMoney, occurrencesInRange, toISODate } from "@/lib/kyte/bills";
import { AnimatedMoney } from "@/lib/kyte/animated";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Kyte" }] }),
  component: CalendarTab,
});

function CalendarTab() {
  const { data: bills = [] } = useQuery(billsQuery);
  const { data: profile } = useQuery(profileQuery);
  const currency = profile?.currency ?? "USD";
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(toISODate(today));

  const { weeks, byDate, monthTotal, maxDay, weekTotal } = useMemo(() => {
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const map = new Map<string, { amount: number; bills: typeof bills }>();
    let total = 0;
    let max = 0;
    for (const b of bills) {
      const occ = occurrencesInRange(b, start, end);
      for (const d of occ) {
        const k = toISODate(d);
        const entry = map.get(k) ?? { amount: 0, bills: [] };
        entry.amount += Number(b.amount);
        entry.bills.push(b);
        map.set(k, entry);
        total += Number(b.amount);
        if (entry.amount > max) max = entry.amount;
      }
    }
    const firstDow = start.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++)
      days.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    const w: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));

    // Week ahead total (next 7 days from today)
    const weekStart = new Date(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    let wt = 0;
    for (const b of bills) {
      for (const _ of occurrencesInRange(b, weekStart, weekEnd)) wt += Number(b.amount);
    }
    return { weeks: w, byDate: map, monthTotal: total, maxDay: max, weekTotal: wt };
  }, [view, bills]);

  const selectedEntry = byDate.get(selected);
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" />

      {/* Hero summary */}
      <section className="mx-5 mb-5 overflow-hidden rounded-3xl border border-border bg-surface-elevated p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Due this month
            </p>
            <div className="mt-1 font-display text-3xl font-bold text-foreground">
              <AnimatedMoney value={monthTotal} currency={currency} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatMoney(weekTotal, currency)} in the next 7 days
            </p>
          </div>
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground shadow-glow"
            style={{ background: "var(--gradient-hero, hsl(var(--primary)))" }}
          >
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="mx-5 rounded-3xl border border-border bg-surface-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground transition active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-base font-bold text-foreground">{monthLabel}</span>
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground transition active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {weeks.flat().map((d, i) => {
            if (!d) return <span key={i} />;
            const k = toISODate(d);
            const entry = byDate.get(k);
            const isToday = k === toISODate(today);
            const isSelected = k === selected;
            const intensity = entry && maxDay > 0 ? Math.min(1, entry.amount / maxDay) : 0;
            const bg = isSelected
              ? "hsl(var(--primary))"
              : entry
              ? `color-mix(in oklab, hsl(var(--primary)) ${Math.round(15 + intensity * 55)}%, transparent)`
              : undefined;
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                style={bg ? { background: bg } : undefined}
                className={`relative aspect-square rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "text-primary-foreground shadow-glow"
                    : entry
                    ? "text-foreground"
                    : isToday
                    ? "text-primary"
                    : "text-foreground hover:bg-surface"
                }`}
              >
                <span className="relative z-10">{d.getDate()}</span>
                {isToday && !isSelected && (
                  <span className="absolute inset-0 rounded-lg ring-1 ring-primary/60" />
                )}
                {entry && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Heatmap legend */}
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((v) => (
            <span
              key={v}
              className="h-2 w-4 rounded"
              style={{
                background: `color-mix(in oklab, hsl(var(--primary)) ${Math.round(v * 100)}%, transparent)`,
              }}
            />
          ))}
          <span>More</span>
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            {new Date(selected).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          {selectedEntry && (
            <span className="text-xs font-semibold text-foreground">
              {formatMoney(selectedEntry.amount, currency)}
            </span>
          )}
        </div>
        {!selectedEntry ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Nothing due — enjoy a calm day.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 animate-fade-in-up">
            {selectedEntry.bills.map((b) => (
              <li key={b.id}>
                <BillRow bill={b} currency={currency} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
