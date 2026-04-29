
-- Journal entries (header)
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT,
  entry_date DATE NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM
  branch_id TEXT,
  country TEXT NOT NULL CHECK (country IN ('SG','AU')),
  source_type TEXT NOT NULL DEFAULT 'manual', -- manual, invoice, payment, payroll, claim, expense, inventory, bank, adjustment
  source_id TEXT,
  narration TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','void')),
  created_by TEXT,
  posted_at TIMESTAMPTZ,
  posted_by TEXT,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_period ON public.journal_entries(period);
CREATE INDEX idx_journal_entries_branch ON public.journal_entries(branch_id);
CREATE INDEX idx_journal_entries_country ON public.journal_entries(country);
CREATE INDEX idx_journal_entries_source ON public.journal_entries(source_type, source_id);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);

-- Journal lines (detail)
CREATE TABLE public.journal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL DEFAULT 1,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_code_id UUID REFERENCES public.tax_codes(id),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  branch_id TEXT,
  contact_type TEXT, -- student / employee / supplier
  contact_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX idx_journal_lines_journal ON public.journal_lines(journal_id);
CREATE INDEX idx_journal_lines_account ON public.journal_lines(account_id);
CREATE INDEX idx_journal_lines_branch ON public.journal_lines(branch_id);

-- Auto-set period and posted_at
CREATE OR REPLACE FUNCTION public.journal_entries_set_period()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entry_date IS NOT NULL THEN
    NEW.period := to_char(NEW.entry_date, 'YYYY-MM');
  END IF;
  IF NEW.status = 'posted' AND (OLD IS NULL OR OLD.status <> 'posted') THEN
    NEW.posted_at := COALESCE(NEW.posted_at, now());
  END IF;
  IF NEW.status = 'void' AND (OLD IS NULL OR OLD.status <> 'void') THEN
    NEW.voided_at := COALESCE(NEW.voided_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_journal_entries_set_period
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.journal_entries_set_period();

-- Balanced-journal validation on post
CREATE OR REPLACE FUNCTION public.journal_entries_validate_balanced()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  total_debit NUMERIC(14,2);
  total_credit NUMERIC(14,2);
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO total_debit, total_credit
  FROM public.journal_lines WHERE journal_id = NEW.id;
  IF total_debit IS NULL OR total_debit = 0 THEN
    RAISE EXCEPTION 'Cannot post journal % with no lines', NEW.id;
  END IF;
  IF round(total_debit,2) <> round(total_credit,2) THEN
    RAISE EXCEPTION 'Journal % is not balanced: debit % vs credit %', NEW.id, total_debit, total_credit;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_journal_entries_validate_balanced
AFTER UPDATE OF status ON public.journal_entries
FOR EACH ROW WHEN (NEW.status = 'posted')
EXECUTE FUNCTION public.journal_entries_validate_balanced();

-- RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read journals"
ON public.journal_entries FOR SELECT TO authenticated
USING (
  public.get_current_user_role() = 'superadmin'
  OR branch_id IS NULL
  OR public.has_branch_access(branch_id)
);

CREATE POLICY "Superadmin manage journals"
ON public.journal_entries FOR ALL TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Authenticated can read journal lines"
ON public.journal_lines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_lines.journal_id
    AND (
      public.get_current_user_role() = 'superadmin'
      OR je.branch_id IS NULL
      OR public.has_branch_access(je.branch_id)
    )
  )
);

CREATE POLICY "Superadmin manage journal lines"
ON public.journal_lines FOR ALL TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');
