CREATE TABLE public.invoice_discount_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_data JSONB NOT NULL,
  student_name TEXT NOT NULL,
  branch_name TEXT,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT,
  requested_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_discount_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins and admins can view discount approvals"
  ON public.invoice_discount_approvals
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('superadmin', 'admin')
    OR requested_by_email = auth.email()
  );

CREATE POLICY "Authenticated users can insert discount approvals"
  ON public.invoice_discount_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can update discount approvals"
  ON public.invoice_discount_approvals
  FOR UPDATE
  TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');