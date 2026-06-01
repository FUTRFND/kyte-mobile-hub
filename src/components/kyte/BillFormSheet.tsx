import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_COLORS, type Bill, type Frequency } from "@/lib/kyte/bills";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  amount: z.coerce.number().min(0).max(1_000_000),
  due_date: z.string().min(1, "Required"),
  frequency: z.enum(["once", "weekly", "monthly", "yearly"]),
  category: z.string().min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
});
type Values = z.infer<typeof schema>;

export function BillFormSheet({
  open,
  onClose,
  bill,
}: {
  open: boolean;
  onClose: () => void;
  bill?: Bill;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: "",
        amount: 0,
        due_date: new Date().toISOString().slice(0, 10),
        frequency: "monthly",
        category: "Other",
        notes: "",
      },
    });

  useEffect(() => {
    if (!open) return;
    if (bill) {
      reset({
        name: bill.name,
        amount: Number(bill.amount),
        due_date: bill.due_date,
        frequency: bill.frequency,
        category: bill.category,
        notes: bill.notes ?? "",
      });
    } else {
      reset({
        name: "",
        amount: 0,
        due_date: new Date().toISOString().slice(0, 10),
        frequency: "monthly",
        category: "Other",
        notes: "",
      });
    }
  }, [open, bill, reset]);

  const onSubmit = async (v: Values) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      name: v.name,
      amount: v.amount,
      due_date: v.due_date,
      frequency: v.frequency as Frequency,
      category: v.category,
      color: CATEGORY_COLORS[v.category] ?? "#0098FF",
      notes: v.notes || null,
    };
    if (bill) {
      await supabase.from("bills").update(payload).eq("id", bill.id);
    } else {
      await supabase.from("bills").insert(payload);
    }
    qc.invalidateQueries({ queryKey: ["bills"] });
    onClose();
  };

  if (!open) return null;

  const cat = watch("category");

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-display text-lg font-bold text-foreground">
            {bill ? "Edit bill" : "New bill"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">
          <Field label="Name" error={errors.name?.message}>
            <input
              {...register("name")}
              placeholder="Netflix, Rent, etc."
              className="h-12 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" error={errors.amount?.message}>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register("amount")}
                className="h-12 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
              />
            </Field>
            <Field label="First due" error={errors.due_date?.message}>
              <input
                type="date"
                {...register("due_date")}
                className="h-12 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none"
              />
            </Field>
          </div>

          <Field label="Frequency">
            <div className="grid grid-cols-4 gap-2">
              {(["once", "weekly", "monthly", "yearly"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setValue("frequency", f, { shouldDirty: true })}
                  className={`h-10 rounded-xl text-xs font-semibold capitalize ${
                    watch("frequency") === f
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setValue("category", c, { shouldDirty: true })}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    cat === c
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[c] }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground outline-none"
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-14 rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : bill ? "Save changes" : "Add bill"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
