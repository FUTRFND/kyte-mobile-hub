
-- Sprint 3/4/5 schema: full reminder prefs, per-bill snooze, Teller accounts skeleton

-- Extend profiles with full reminder prefs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_days_array integer[] NOT NULL DEFAULT '{2}',
  ADD COLUMN IF NOT EXISTS reminder_channels text[] NOT NULL DEFAULT '{push}',
  ADD COLUMN IF NOT EXISTS quiet_hours_start integer,   -- 0..23 hour
  ADD COLUMN IF NOT EXISTS quiet_hours_end integer,     -- 0..23 hour
  ADD COLUMN IF NOT EXISTS smart_timing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_requires_biometric boolean NOT NULL DEFAULT false;

-- Backfill array from legacy scalar
UPDATE public.profiles
SET reminder_days_array = ARRAY[reminder_days_default]
WHERE reminder_days_array = '{2}' AND reminder_days_default IS NOT NULL AND reminder_days_default <> 2;

-- Per-bill snooze
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS snoozed_until date;

-- Teller-style linked accounts (skeleton; tokens never returned to client)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'teller',
  institution text,
  mask text,
  status text NOT NULL DEFAULT 'pending',
  access_token_encrypted bytea,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_select_own ON public.accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY accounts_insert_own ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY accounts_update_own ON public.accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY accounts_delete_own ON public.accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
