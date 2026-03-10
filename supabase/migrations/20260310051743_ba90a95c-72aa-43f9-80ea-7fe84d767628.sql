
-- Create student_withdrawal_requests table
CREATE TABLE public.student_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Superadmins can do everything
CREATE POLICY "Superadmins full access on withdrawal requests"
  ON public.student_withdrawal_requests
  FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- Employees with branch access can insert
CREATE POLICY "Branch staff can insert withdrawal requests"
  ON public.student_withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superadmin')
    OR public.has_branch_access(branch_id)
  );

-- Employees with branch access can select
CREATE POLICY "Branch staff can view withdrawal requests"
  ON public.student_withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('admin', 'superadmin')
    OR public.has_branch_access(branch_id)
  );

-- Updated_at trigger
CREATE TRIGGER update_student_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.student_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
