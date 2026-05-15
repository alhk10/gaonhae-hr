ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pr_start_date date,
  ADD COLUMN IF NOT EXISTS cpf_contribution_type text,
  ADD COLUMN IF NOT EXISTS additional_wages_default numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_help_group text,
  ADD COLUMN IF NOT EXISTS agency_fund_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS sdl_payable boolean NOT NULL DEFAULT true;