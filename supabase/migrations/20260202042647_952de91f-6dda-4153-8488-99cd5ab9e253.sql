-- Create invoice deletion requests table
CREATE TABLE public.invoice_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create deletion requests
CREATE POLICY "Authenticated users can create invoice deletion requests"
ON public.invoice_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own invoice deletion requests"
ON public.invoice_deletion_requests
FOR SELECT
TO authenticated
USING (requested_by_email = auth.email());

-- Policy: Superadmins can view all requests
CREATE POLICY "Superadmins can view all invoice deletion requests"
ON public.invoice_deletion_requests
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Policy: Superadmins can update requests (for approval/rejection)
CREATE POLICY "Superadmins can update invoice deletion requests"
ON public.invoice_deletion_requests
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Policy: Superadmins can delete requests
CREATE POLICY "Superadmins can delete invoice deletion requests"
ON public.invoice_deletion_requests
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Create index for faster lookups
CREATE INDEX idx_invoice_deletion_requests_status ON public.invoice_deletion_requests(status);
CREATE INDEX idx_invoice_deletion_requests_invoice_id ON public.invoice_deletion_requests(invoice_id);