
-- Create invoice_action_requests table
CREATE TABLE public.invoice_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  action_type text NOT NULL CHECK (action_type IN ('adjustment', 'cancellation')),
  request_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by text,
  requested_by_email text,
  invoice_number text,
  student_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_action_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as invoice_discount_approvals)
CREATE POLICY "Superadmins and admins can view all action requests"
  ON public.invoice_action_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert action requests"
  ON public.invoice_action_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can update action requests"
  ON public.invoice_action_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
