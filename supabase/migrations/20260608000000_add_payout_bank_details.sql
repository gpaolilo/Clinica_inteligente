-- Add payout bank details to stripe_connected_accounts table
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS holder_name text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS bank_agency text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS pix_key_type text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_complement text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_neighborhood text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE public.stripe_connected_accounts ADD COLUMN IF NOT EXISTS address_postal_code text;
