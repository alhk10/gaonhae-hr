ALTER TABLE public.grading_payment_submissions
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

ALTER TABLE public.seminar_payment_submissions
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

ALTER TABLE public.public_chat_payment_submissions
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

ALTER TABLE public.guards_purchases
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;