
-- Add verification rejection columns to payments
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- Backfill existing data
UPDATE public.payments SET verification_status = 'verified' WHERE is_verified = true;
UPDATE public.payments SET verification_status = 'pending' WHERE is_verified = false;
