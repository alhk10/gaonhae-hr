
CREATE TABLE public.employee_branch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  current_branch text,
  requested_branch text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_branch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read branch requests"
  ON public.employee_branch_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Employees can insert own branch requests"
  ON public.employee_branch_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_current_employee_id() OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can update branch requests"
  ON public.employee_branch_requests FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'superadmin');

CREATE TRIGGER update_employee_branch_requests_updated_at
  BEFORE UPDATE ON public.employee_branch_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
