ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS teller_account_id text,
  ADD COLUMN IF NOT EXISTS teller_enrollment_id text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS balance_available numeric,
  ADD COLUMN IF NOT EXISTS balance_ledger numeric,
  ADD COLUMN IF NOT EXISTS balances_refreshed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_teller_account_id_key
  ON public.accounts (user_id, teller_account_id)
  WHERE teller_account_id IS NOT NULL;