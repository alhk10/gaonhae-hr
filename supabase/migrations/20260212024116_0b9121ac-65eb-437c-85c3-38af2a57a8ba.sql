
-- Create grading registration deletion requests table
CREATE TABLE public.grading_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.grading_registrations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can create deletion requests"
ON public.grading_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view
CREATE POLICY "Authenticated users can view deletion requests"
ON public.grading_deletion_requests
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update (for approval/rejection)
CREATE POLICY "Authenticated users can update deletion requests"
ON public.grading_deletion_requests
FOR UPDATE
TO authenticated
USING (true);
