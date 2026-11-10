CREATE TABLE public.branch_profit_loss_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id varchar NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  category varchar NOT NULL,
  subcategory varchar NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  share_percentage numeric(5,2) DEFAULT 100,
  type varchar NOT NULL CHECK (type IN ('revenue','expense')),
  cost_price numeric,
  quantity numeric DEFAULT 1,
  sales_amount numeric DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  created_by varchar, updated_by varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_profit_loss_entries TO authenticated;
GRANT ALL ON public.branch_profit_loss_entries TO service_role;
ALTER TABLE public.branch_profit_loss_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pnl_entries_select" ON public.branch_profit_loss_entries FOR SELECT TO authenticated USING (public.has_branch_access(branch_id));
CREATE POLICY "pnl_entries_superadmin_all" ON public.branch_profit_loss_entries FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin') WITH CHECK (public.get_current_user_role() = 'superadmin');
CREATE INDEX ON public.branch_profit_loss_entries(branch_id, month, year, category, subcategory);
CREATE TRIGGER update_branch_profit_loss_entries_updated_at BEFORE UPDATE ON public.branch_profit_loss_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pl_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('revenue','expense')),
  default_cost_price numeric,
  sort_order integer DEFAULT 0,
  created_by text, updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pl_categories TO authenticated;
GRANT ALL ON public.pl_categories TO service_role;
ALTER TABLE public.pl_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pl_categories_select" ON public.pl_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "pl_categories_superadmin_all" ON public.pl_categories FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin') WITH CHECK (public.get_current_user_role() = 'superadmin');
CREATE TRIGGER update_pl_categories_updated_at BEFORE UPDATE ON public.pl_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.published_pl_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_pl_reports TO authenticated;
GRANT ALL ON public.published_pl_reports TO service_role;
ALTER TABLE public.published_pl_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published_pl_select" ON public.published_pl_reports FOR SELECT TO authenticated USING (public.has_branch_access(branch_id));
CREATE POLICY "published_pl_superadmin_all" ON public.published_pl_reports FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin') WITH CHECK (public.get_current_user_role() = 'superadmin');

-- restore old entries that were carried into the journal
INSERT INTO public.branch_profit_loss_entries(branch_id, month, year, category, subcategory, description, amount, type, created_by, created_at)
SELECT branch_id, extract(month FROM entry_date)::int, extract(year FROM entry_date)::int,
  coalesce(category,'Other'), coalesce(category,'Other'), nullif(description,''), amount,
  CASE WHEN direction='in' THEN 'revenue' ELSE 'expense' END, created_by_label, created_at
FROM public.branch_journal_entries
WHERE created_at < '2026-10-27 18:33:00+00';

INSERT INTO public.pl_categories(name, type)
SELECT DISTINCT ON (subcategory) subcategory, type FROM public.branch_profit_loss_entries
ORDER BY subcategory, type
ON CONFLICT (name) DO NOTHING;