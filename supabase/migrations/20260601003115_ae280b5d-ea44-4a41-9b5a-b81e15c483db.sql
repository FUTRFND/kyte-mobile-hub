-- =========================
-- updated_at helper
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- bills
-- =========================
CREATE TYPE public.bill_frequency AS ENUM ('once', 'weekly', 'monthly', 'yearly');

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  frequency public.bill_frequency NOT NULL DEFAULT 'monthly',
  category TEXT NOT NULL DEFAULT 'Other',
  color TEXT NOT NULL DEFAULT '#0098FF',
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bills_user_due_idx ON public.bills(user_id, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills_select_own" ON public.bills
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bills_insert_own" ON public.bills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_update_own" ON public.bills
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bills_delete_own" ON public.bills
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- bill_payments
-- =========================
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL,
  period_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bill_payments_user_paid_idx ON public.bill_payments(user_id, paid_on);
CREATE INDEX bill_payments_bill_period_idx ON public.bill_payments(bill_id, period_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own" ON public.bill_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON public.bill_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_update_own" ON public.bill_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payments_delete_own" ON public.bill_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);