-- Add Stripe account ID field to branches for multi-account payment integration
ALTER TABLE public.branches 
ADD COLUMN stripe_account_id text;