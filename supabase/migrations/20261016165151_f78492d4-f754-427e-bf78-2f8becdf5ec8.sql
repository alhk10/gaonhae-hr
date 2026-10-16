ALTER TABLE public.payroll_monthly_overrides
  ADD COLUMN IF NOT EXISTS unpaid_leave_days_override numeric,
  ADD COLUMN IF NOT EXISTS encashment_override numeric;