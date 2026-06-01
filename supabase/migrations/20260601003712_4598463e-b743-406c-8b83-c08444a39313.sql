-- profile additions
ALTER TABLE public.profiles
  ADD COLUMN monthly_budget NUMERIC(12,2),
  ADD COLUMN reminder_days_default INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN biometric_enabled BOOLEAN NOT NULL DEFAULT false;

-- per-bill reminder override
ALTER TABLE public.bills
  ADD COLUMN reminder_days INTEGER;

-- incomes (recurring)
CREATE TABLE public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequency public.bill_frequency NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX incomes_user_idx ON public.incomes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incomes_select_own" ON public.incomes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert_own" ON public.incomes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update_own" ON public.incomes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "incomes_delete_own" ON public.incomes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER incomes_updated_at
  BEFORE UPDATE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transactions (one-off)
CREATE TYPE public.txn_kind AS ENUM ('expense', 'income');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  kind public.txn_kind NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT 'Other',
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transactions_user_date_idx ON public.transactions(user_id, occurred_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "txn_select_own" ON public.transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "txn_insert_own" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "txn_update_own" ON public.transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "txn_delete_own" ON public.transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);