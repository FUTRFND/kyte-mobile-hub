import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/kyte/PageHeader";
import { BillRow } from "@/components/kyte/BillRow";
import { billsQuery, profileQuery } from "@/lib/kyte/queries";
import { formatMoney, occurrencesInRange, toISODate } from "@/lib/kyte/bills";

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

  const { weeks, byDate, monthTotal } = useMemo(() => {
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const map = new Map<string, { amount: number; bills: typeof bills }>();
    let total = 0;
    for (const b of bills) {
      const occ = occurrencesInRange(b, start, end);
      for (const d of occ) {
        const k = toISODate(d);
        const entry = map.get(k) ?? { amount: 0, bills: [] };
        entry.amount += Number(b.amount);
        entry.bills.push(b);
        map.set(k, entry);
        total += Number(b.amount);
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
    return { weeks: w, byDate: map, monthTotal: total };
  }, [view, bills]);

  const selectedEntry = byDate.get(selected);
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" subtitle={`${formatMoney(monthTotal, currency)} this month`} />

      <section className="mx-5 rounded-3xl border border-border bg-surface-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-base font-bold text-foreground">{monthLabel}</span>
          <button
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground"
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
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                className={`relative aspect-square rounded-lg text-sm font-medium transition ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "bg-surface text-primary"
                    : "text-foreground hover:bg-surface"
                }`}
              >
                {d.getDate()}
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
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          {new Date(selected).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        {!selectedEntry ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Nothing due.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
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
