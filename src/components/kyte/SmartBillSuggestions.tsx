import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Check, X, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_COLORS, formatMoney } from "@/lib/kyte/bills";

type Suggestion = {
  key: string;
  name: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "biweekly" | "yearly";
  lastDate: string;
  nextDueDate: string;
  occurrences: number;
  confidence: number;
  sampleDescription: string;
};

async function fetchSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase.functions.invoke<{ suggestions: Suggestion[] }>(
    "detect-bills",
    { body: {} },
  );
  if (error) throw error;
  return data?.suggestions ?? [];
}

export function SmartBillSuggestions({ currency = "USD" }: { currency?: string }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: suggestions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["bill-suggestions"],
    queryFn: fetchSuggestions,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async (s: Suggestion) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      // Map detector frequency to the bill_frequency enum (no biweekly).
      const freq: "monthly" | "weekly" | "yearly" =
        s.frequency === "biweekly" ? "weekly" : s.frequency;
      const amount = s.frequency === "biweekly" ? s.amount : s.amount;
      const { error } = await supabase.from("bills").insert({
        user_id: u.user.id,
        name: s.name,
        amount,
        due_date: s.nextDueDate,
        frequency: freq,
        category: s.category,
        color: CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.Other,
      });
      if (error) throw error;
    },
    onSuccess: (_d, s) => {
      setDismissed((p) => new Set(p).add(s.key));
      qc.invalidateQueries({ queryKey: ["bills"] });
    },
  });

  const visible = suggestions.filter((s) => !dismissed.has(s.key));

  if (isLoading) {
    return (
      <SectionFrame>
        <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning for recurring charges…
        </div>
      </SectionFrame>
    );
  }

  if (visible.length === 0) return null;

  return (
    <SectionFrame onRefresh={() => refetch()} refreshing={isFetching}>
      <ul className="flex flex-col gap-2">
        {visible.slice(0, 4).map((s, i) => (
          <li
            key={s.key}
            className="animate-fade-in-up rounded-2xl border border-border bg-surface-elevated p-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                style={{
                  background: `linear-gradient(135deg, ${CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.Other}, hsl(var(--primary)))`,
                }}
              >
                <Wand2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="shrink-0 font-display text-sm font-bold text-foreground">
                    {formatMoney(s.amount, currency)}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {s.frequency} · {s.occurrences}× seen · {Math.round(s.confidence * 100)}% match
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => accept.mutate(s)}
                    disabled={accept.isPending}
                    className="flex h-8 items-center gap-1 rounded-full bg-gradient-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-glow active:scale-95"
                  >
                    <Check className="h-3 w-3" /> Add bill
                  </button>
                  <button
                    onClick={() => setDismissed((p) => new Set(p).add(s.key))}
                    className="flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[11px] font-medium text-muted-foreground"
                  >
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

function SectionFrame({
  children,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <section className="mx-5 mt-5 animate-fade-in-up">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            Smart suggestions
          </h2>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-[11px] font-semibold text-primary disabled:opacity-50"
          >
            {refreshing ? "Scanning…" : "Rescan"}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
