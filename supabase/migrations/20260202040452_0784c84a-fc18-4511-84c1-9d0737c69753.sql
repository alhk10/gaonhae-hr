-- Create payment_deletion_requests table
CREATE TABLE public.payment_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT (create requests)
CREATE POLICY "Authenticated users can create deletion requests"
ON public.payment_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can SELECT their own requests
CREATE POLICY "Users can view their own deletion requests"
ON public.payment_deletion_requests
FOR SELECT
TO authenticated
USING (requested_by_email = auth.email());

-- Superadmins can SELECT all requests
CREATE POLICY "Superadmins can view all deletion requests"
ON public.payment_deletion_requests
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Superadmins can UPDATE requests (for approval/rejection)
CREATE POLICY "Superadmins can update deletion requests"
ON public.payment_deletion_requests
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Superadmins can DELETE requests
CREATE POLICY "Superadmins can delete deletion requests"
ON public.payment_deletion_requests
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'superadmin');