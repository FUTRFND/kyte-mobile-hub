ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS plaid_item_id text,
  ADD COLUMN IF NOT EXISTS plaid_account_id text;

ALTER TABLE public.accounts ALTER COLUMN provider SET DEFAULT 'plaid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_user_plaid_account_unique'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_user_plaid_account_unique
      UNIQUE (user_id, plaid_account_id);
  END IF;
END $$;

-- Teller is no longer an active provider. Preserve legacy rows for audit/rollback,
-- but make sure the application never treats them as connected.
UPDATE public.accounts
SET status = 'disconnected', updated_at = now()
WHERE provider = 'teller' AND status <> 'disconnected';
