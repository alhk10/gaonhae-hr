ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS competition_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporting_at timestamptz,
  ADD COLUMN IF NOT EXISTS court text;