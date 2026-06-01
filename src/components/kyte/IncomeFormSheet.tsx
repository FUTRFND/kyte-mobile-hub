import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Income } from "@/lib/kyte/queries";
import type { Frequency } from "@/lib/kyte/bills";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  amount: z.coerce.number().min(0).max(10_000_000),
  start_date: z.string().min(1),
  frequency: z.enum(["once", "weekly", "monthly", "yearly"]),
});
type Values = z.infer<typeof schema>;

export function IncomeFormSheet({
  open,
  onClose,
  income,
}: {
  open: boolean;
  onClose: () => void;
  income?: Income;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: "",
        amount: 0,
        start_date: new Date().toISOString().slice(0, 10),
        frequency: "monthly",
      },
    });

  useEffect(() => {
    if (!open) return;
    reset(
      income
        ? {
            name: income.name,
            amount: Number(income.amount),
            start_date: income.start_date,
            frequency: income.frequency,
          }
        : {
            name: "",
            amount: 0,
            start_date: new Date().toISOString().slice(0, 10),
            frequency: "monthly",
          },
    );
  }, [open, income, reset]);

  const onSubmit = async (v: Values) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { ...v, frequency: v.frequency as Frequency, user_id: u.user.id };
    if (income) await supabase.from("incomes").update(payload).eq("id", income.id);
    else await supabase.from("incomes").insert(payload);
    qc.invalidateQueries({ queryKey: ["incomes"] });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex w-full flex-col rounded-t-3xl border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-display text-lg font-bold text-foreground">
            {income ? "Edit income" : "New income"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 px-5 pb-5">
          <Field label="Source" error={errors.name?.message}>
            <input
              {...register("name")}
              placeholder="Salary, freelance, etc."
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
            <Field label="Starting">
              <input
                type="date"
                {...register("start_date")}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-14 rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : income ? "Save changes" : "Add income"}
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
