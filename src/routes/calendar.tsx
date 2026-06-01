import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PreviewAppShell } from "@/components/kyte/PreviewAppShell";
import { PreviewBillRow } from "@/components/kyte/PreviewBillRow";
import { PageHeader } from "@/components/kyte/PageHeader";
import { formatMoney, occurrencesInRange, toISODate } from "@/lib/kyte/bills";
import { previewBills, previewProfile } from "@/lib/kyte/previewData";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Kyte" }] }),
  component: CalendarPreviewPage,
});

function CalendarPreviewPage() {
  const currency = previewProfile.currency;
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(toISODate(today));

  const { weeks, byDate, monthTotal } = useMemo(() => {
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const map = new Map<string, { amount: number; bills: typeof previewBills }>();
    let total = 0;

    for (const bill of previewBills) {
      const occ = occurrencesInRange(bill, start, end);
      for (const due of occ) {
        const key = toISODate(due);
        const entry = map.get(key) ?? { amount: 0, bills: [] };
        entry.amount += Number(bill.amount);
        entry.bills.push(bill);
        map.set(key, entry);
        total += Number(bill.amount);
      }
    }

    const firstDow = start.getDay();
    const days: Array<Date | null> = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);

    const chunked: Array<Array<Date | null>> = [];
    for (let i = 0; i < days.length; i += 7) chunked.push(days.slice(i, i + 7));

    return { weeks: chunked, byDate: map, monthTotal: total };
  }, [view]);

  const selectedEntry = byDate.get(selected);
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <PreviewAppShell>
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
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <span key={i} className="py-1">{day}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {weeks.flat().map((day, i) => {
            if (!day) return <span key={i} />;
            const key = toISODate(day);
            const entry = byDate.get(key);
            const isToday = key === toISODate(today);
            const isSelected = key === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(key)}
                className={`relative aspect-square rounded-lg text-sm font-medium transition ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-surface text-primary"
                      : "text-foreground hover:bg-surface"
                }`}
              >
                {day.getDate()}
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
            {selectedEntry.bills.map((bill) => (
              <li key={bill.id}>
                <PreviewBillRow bill={bill} currency={currency} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PreviewAppShell>
  );
}
