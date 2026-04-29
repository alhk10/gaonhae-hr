ALTER TABLE public.journal_lines
  ADD COLUMN IF NOT EXISTS tax_base_amount numeric(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_journal_lines_tax_code_id ON public.journal_lines(tax_code_id);

CREATE TABLE IF NOT EXISTS public.tax_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL CHECK (country IN ('Singapore','Australia')),
  branch_id text NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','locked','filed')),
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  locked_at timestamptz,
  locked_by text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, period_from, period_to)
);

CREATE INDEX IF NOT EXISTS idx_tax_returns_branch_period ON public.tax_returns(branch_id, period_from, period_to);

ALTER TABLE public.tax_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tax returns viewable by branch users" ON public.tax_returns;
CREATE POLICY "Tax returns viewable by branch users"
  ON public.tax_returns FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
  );

DROP POLICY IF EXISTS "Superadmin manages tax returns" ON public.tax_returns;
CREATE POLICY "Superadmin manages tax returns"
  ON public.tax_returns FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

DROP TRIGGER IF EXISTS trg_tax_returns_updated ON public.tax_returns;
CREATE TRIGGER trg_tax_returns_updated
  BEFORE UPDATE ON public.tax_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();