
CREATE TABLE public.slot_booking_edit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id text NOT NULL,
  request_type text NOT NULL,
  requested_by text NOT NULL,
  new_employee_id text,
  new_employee_name text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slot_booking_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view edit requests"
ON public.slot_booking_edit_requests FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create edit requests"
ON public.slot_booking_edit_requests FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update edit requests"
ON public.slot_booking_edit_requests FOR UPDATE
TO authenticated USING (true);
