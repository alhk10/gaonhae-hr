-- ============================================================
-- ACCOUNTING MODULE — Phase 1 Foundation
-- ============================================================

-- Tax codes
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('Singapore','Australia')),
  rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  report_box TEXT,
  direction TEXT NOT NULL DEFAULT 'output' CHECK (direction IN ('output','input','none')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country, code)
);

-- Chart of accounts
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  subtype TEXT,
  country TEXT NOT NULL CHECK (country IN ('Singapore','Australia')),
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  default_tax_code_id UUID REFERENCES public.tax_codes(id) ON DELETE SET NULL,
  system_account BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country, code)
);
CREATE INDEX idx_coa_country_type ON public.chart_of_accounts(country, type);
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(parent_id);

-- Fiscal periods (lockable)
CREATE TABLE public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL CHECK (country IN ('Singapore','Australia')),
  period TEXT NOT NULL, -- 'YYYY-MM'
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country, period)
);

-- Updated_at triggers
CREATE TRIGGER trg_tax_codes_updated_at BEFORE UPDATE ON public.tax_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_coa_updated_at BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fiscal_periods_updated_at BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

-- Read for any authenticated user
CREATE POLICY "Auth can view tax_codes" ON public.tax_codes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can view coa" ON public.chart_of_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can view fiscal_periods" ON public.fiscal_periods
  FOR SELECT TO authenticated USING (true);

-- Write only for superadmins
CREATE POLICY "Superadmin manage tax_codes" ON public.tax_codes
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');
CREATE POLICY "Superadmin manage coa" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');
CREATE POLICY "Superadmin manage fiscal_periods" ON public.fiscal_periods
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- ============================================================
-- SEED TAX CODES
-- ============================================================
INSERT INTO public.tax_codes (code, name, country, rate, report_box, direction) VALUES
  -- Singapore
  ('SG-SR',  'Standard-Rated Supplies (9%)',     'Singapore', 0.09, 'Box 1/6', 'output'),
  ('SG-ZR',  'Zero-Rated Supplies',              'Singapore', 0.00, 'Box 2',   'output'),
  ('SG-ES',  'Exempt Supplies',                  'Singapore', 0.00, 'Box 3',   'output'),
  ('SG-OS',  'Out-of-Scope Supplies',            'Singapore', 0.00, 'Box 4',   'output'),
  ('SG-TX',  'Taxable Purchases (9%)',           'Singapore', 0.09, 'Box 5/7', 'input'),
  ('SG-BL',  'Blocked Input Tax',                'Singapore', 0.00, 'Box 5',   'input'),
  ('SG-NR',  'Non-GST Registered Purchases',     'Singapore', 0.00, 'Box 5',   'input'),
  -- Australia
  ('AU-GST', 'GST on Sales (10%)',               'Australia', 0.10, '1A/G1',   'output'),
  ('AU-FRE', 'GST-Free Sales',                   'Australia', 0.00, 'G3',      'output'),
  ('AU-EXP', 'Export Sales',                     'Australia', 0.00, 'G2',      'output'),
  ('AU-INP', 'GST on Purchases (10%)',           'Australia', 0.10, '1B/G11',  'input'),
  ('AU-CAP', 'GST on Capital Purchases (10%)',   'Australia', 0.10, '1B/G10',  'input'),
  ('AU-NT',  'Not Reportable',                   'Australia', 0.00, NULL,      'none');

-- ============================================================
-- SEED CHART OF ACCOUNTS — SINGAPORE
-- ============================================================
INSERT INTO public.chart_of_accounts (code, name, type, subtype, country, system_account, sort_order, default_tax_code_id) VALUES
  -- Assets
  ('1000','Cash on Hand',                  'asset','current_asset','Singapore', true, 10, NULL),
  ('1010','Bank — Operating Account',      'asset','bank',         'Singapore', true, 20, NULL),
  ('1020','Bank — PayNow',                 'asset','bank',         'Singapore', true, 30, NULL),
  ('1100','Accounts Receivable',           'asset','current_asset','Singapore', true, 40, NULL),
  ('1110','Student Credits Receivable',    'asset','current_asset','Singapore', true, 50, NULL),
  ('1200','Inventory',                     'asset','current_asset','Singapore', true, 60, NULL),
  ('1500','Fixed Assets',                  'asset','fixed_asset',  'Singapore', false, 70, NULL),
  ('1510','Accumulated Depreciation',      'asset','fixed_asset',  'Singapore', false, 80, NULL),
  -- Liabilities
  ('2000','Accounts Payable',              'liability','current_liability','Singapore', true, 100, NULL),
  ('2100','GST Payable',                   'liability','tax',              'Singapore', true, 110, NULL),
  ('2110','GST Receivable (Input)',        'liability','tax',              'Singapore', true, 120, NULL),
  ('2200','Wages Payable',                 'liability','current_liability','Singapore', true, 130, NULL),
  ('2210','CPF Payable',                   'liability','statutory',        'Singapore', true, 140, NULL),
  ('2220','SDL Payable',                   'liability','statutory',        'Singapore', true, 150, NULL),
  ('2300','Student Credits (Liability)',   'liability','current_liability','Singapore', true, 160, NULL),
  ('2400','Claims Payable',                'liability','current_liability','Singapore', true, 170, NULL),
  -- Equity
  ('3000','Owner Equity',                  'equity','equity','Singapore', true, 200, NULL),
  ('3100','Retained Earnings',             'equity','equity','Singapore', true, 210, NULL),
  -- Income
  ('4000','School Fees — Term',            'income','revenue','Singapore', true, 300, NULL),
  ('4010','Grading Fees',                  'income','revenue','Singapore', true, 310, NULL),
  ('4020','Ad-Hoc Lesson Fees',            'income','revenue','Singapore', true, 320, NULL),
  ('4030','Uniform & Gear Sales',          'income','revenue','Singapore', true, 330, NULL),
  ('4040','Trial Class Income',            'income','revenue','Singapore', true, 340, NULL),
  ('4090','Other Income',                  'income','revenue','Singapore', true, 350, NULL),
  ('4900','Sales Discounts',               'income','contra_revenue','Singapore', true, 360, NULL),
  -- Expenses
  ('5000','Cost of Goods Sold',            'expense','cogs','Singapore', true, 400, NULL),
  ('6000','Wages & Salaries',              'expense','operating','Singapore', true, 500, NULL),
  ('6010','Casual Coaching Fees',          'expense','operating','Singapore', true, 510, NULL),
  ('6020','CPF Employer Contribution',     'expense','operating','Singapore', true, 520, NULL),
  ('6030','SDL Expense',                   'expense','operating','Singapore', true, 530, NULL),
  ('6040','Staff Claims',                  'expense','operating','Singapore', true, 540, NULL),
  ('6100','Rent',                          'expense','operating','Singapore', false, 550, NULL),
  ('6110','Utilities',                     'expense','operating','Singapore', false, 560, NULL),
  ('6120','Insurance',                     'expense','operating','Singapore', false, 570, NULL),
  ('6130','Marketing & Advertising',       'expense','operating','Singapore', false, 580, NULL),
  ('6140','Repairs & Maintenance',         'expense','operating','Singapore', false, 590, NULL),
  ('6150','Cleaning & Supplies',           'expense','operating','Singapore', false, 600, NULL),
  ('6200','Bank & Merchant Fees',          'expense','operating','Singapore', false, 610, NULL),
  ('6300','Depreciation Expense',          'expense','operating','Singapore', false, 620, NULL),
  ('6900','Other Expenses',                'expense','operating','Singapore', false, 700, NULL);

-- Set default tax codes for SG income/expense accounts
UPDATE public.chart_of_accounts c
SET default_tax_code_id = (SELECT id FROM public.tax_codes WHERE code='SG-SR')
WHERE c.country='Singapore' AND c.type='income' AND c.code NOT IN ('4900');
UPDATE public.chart_of_accounts c
SET default_tax_code_id = (SELECT id FROM public.tax_codes WHERE code='SG-TX')
WHERE c.country='Singapore' AND c.type='expense' AND c.code NOT IN ('6000','6010','6020','6030');

-- ============================================================
-- SEED CHART OF ACCOUNTS — AUSTRALIA
-- ============================================================
INSERT INTO public.chart_of_accounts (code, name, type, subtype, country, system_account, sort_order, default_tax_code_id) VALUES
  -- Assets
  ('1000','Cash on Hand',                  'asset','current_asset','Australia', true, 10, NULL),
  ('1010','Bank — Operating Account',      'asset','bank',         'Australia', true, 20, NULL),
  ('1100','Accounts Receivable',           'asset','current_asset','Australia', true, 40, NULL),
  ('1110','Student Credits Receivable',    'asset','current_asset','Australia', true, 50, NULL),
  ('1200','Inventory',                     'asset','current_asset','Australia', true, 60, NULL),
  ('1500','Fixed Assets',                  'asset','fixed_asset',  'Australia', false, 70, NULL),
  ('1510','Accumulated Depreciation',      'asset','fixed_asset',  'Australia', false, 80, NULL),
  -- Liabilities
  ('2000','Accounts Payable',              'liability','current_liability','Australia', true, 100, NULL),
  ('2100','GST Payable',                   'liability','tax',              'Australia', true, 110, NULL),
  ('2110','GST Receivable (Input)',        'liability','tax',              'Australia', true, 120, NULL),
  ('2150','PAYG Withholding Payable',      'liability','statutory',        'Australia', true, 125, NULL),
  ('2200','Wages Payable',                 'liability','current_liability','Australia', true, 130, NULL),
  ('2230','Superannuation Payable',        'liability','statutory',        'Australia', true, 145, NULL),
  ('2300','Student Credits (Liability)',   'liability','current_liability','Australia', true, 160, NULL),
  ('2400','Claims Payable',                'liability','current_liability','Australia', true, 170, NULL),
  -- Equity
  ('3000','Owner Equity',                  'equity','equity','Australia', true, 200, NULL),
  ('3100','Retained Earnings',             'equity','equity','Australia', true, 210, NULL),
  -- Income
  ('4000','School Fees — Term',            'income','revenue','Australia', true, 300, NULL),
  ('4010','Grading Fees',                  'income','revenue','Australia', true, 310, NULL),
  ('4020','Ad-Hoc Lesson Fees',            'income','revenue','Australia', true, 320, NULL),
  ('4030','Uniform & Gear Sales',          'income','revenue','Australia', true, 330, NULL),
  ('4040','Trial Class Income',            'income','revenue','Australia', true, 340, NULL),
  ('4090','Other Income',                  'income','revenue','Australia', true, 350, NULL),
  ('4900','Sales Discounts',               'income','contra_revenue','Australia', true, 360, NULL),
  -- Expenses
  ('5000','Cost of Goods Sold',            'expense','cogs','Australia', true, 400, NULL),
  ('6000','Wages & Salaries',              'expense','operating','Australia', true, 500, NULL),
  ('6010','Casual Coaching Fees',          'expense','operating','Australia', true, 510, NULL),
  ('6025','Superannuation Expense',        'expense','operating','Australia', true, 525, NULL),
  ('6040','Staff Claims',                  'expense','operating','Australia', true, 540, NULL),
  ('6100','Rent',                          'expense','operating','Australia', false, 550, NULL),
  ('6110','Utilities',                     'expense','operating','Australia', false, 560, NULL),
  ('6120','Insurance',                     'expense','operating','Australia', false, 570, NULL),
  ('6130','Marketing & Advertising',       'expense','operating','Australia', false, 580, NULL),
  ('6140','Repairs & Maintenance',         'expense','operating','Australia', false, 590, NULL),
  ('6150','Cleaning & Supplies',           'expense','operating','Australia', false, 600, NULL),
  ('6200','Bank & Merchant Fees',          'expense','operating','Australia', false, 610, NULL),
  ('6300','Depreciation Expense',          'expense','operating','Australia', false, 620, NULL),
  ('6900','Other Expenses',                'expense','operating','Australia', false, 700, NULL);

-- Set default tax codes for AU income/expense accounts
UPDATE public.chart_of_accounts c
SET default_tax_code_id = (SELECT id FROM public.tax_codes WHERE code='AU-GST')
WHERE c.country='Australia' AND c.type='income' AND c.code NOT IN ('4900');
UPDATE public.chart_of_accounts c
SET default_tax_code_id = (SELECT id FROM public.tax_codes WHERE code='AU-INP')
WHERE c.country='Australia' AND c.type='expense' AND c.code NOT IN ('6000','6010','6025');