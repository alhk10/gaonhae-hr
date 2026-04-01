
CREATE TABLE public.payroll_monthly_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month text NOT NULL,
  base_salary numeric,
  hourly_rate numeric,
  allowances jsonb DEFAULT '[]'::jsonb,
  deductions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, year, month)
);

ALTER TABLE public.payroll_monthly_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payroll overrides"
ON public.payroll_monthly_overrides
FOR SELECT TO authenticated
USING (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_admin_access('payroll')
);

CREATE POLICY "Admins can insert payroll overrides"
ON public.payroll_monthly_overrides
FOR INSERT TO authenticated
WITH CHECK (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_admin_access('payroll')
);

CREATE POLICY "Admins can update payroll overrides"
ON public.payroll_monthly_overrides
FOR UPDATE TO authenticated
USING (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_admin_access('payroll')
)
WITH CHECK (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_admin_access('payroll')
);

CREATE POLICY "Admins can delete payroll overrides"
ON public.payroll_monthly_overrides
FOR DELETE TO authenticated
USING (
  get_current_user_role() IN ('superadmin', 'admin')
  OR has_admin_access('payroll')
);

CREATE TRIGGER update_payroll_monthly_overrides_updated_at
BEFORE UPDATE ON public.payroll_monthly_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
