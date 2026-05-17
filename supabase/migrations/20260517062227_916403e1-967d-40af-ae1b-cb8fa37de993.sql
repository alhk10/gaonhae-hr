
-- Public grading payment submissions
CREATE TABLE public.grading_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE,
  student_name text NOT NULL,
  branch_id text NOT NULL,
  date_of_birth date NOT NULL,
  current_belt text,
  resolved_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  resolved_grading_slot_id uuid REFERENCES public.grading_slots(id) ON DELETE SET NULL,
  amount numeric(10,2),
  payment_method text NOT NULL DEFAULT 'paynow',
  proof_url text,
  matched_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  matched_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_verification',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamptz,
  CONSTRAINT grading_payment_submissions_status_check
    CHECK (status IN ('pending_verification','verified','rejected','needs_profile'))
);

CREATE INDEX idx_gps_status ON public.grading_payment_submissions(status);
CREATE INDEX idx_gps_branch ON public.grading_payment_submissions(branch_id);
CREATE INDEX idx_gps_slot ON public.grading_payment_submissions(resolved_grading_slot_id);

ALTER TABLE public.grading_payment_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a submission
CREATE POLICY "Anyone can submit grading payment"
  ON public.grading_payment_submissions
  FOR INSERT
  WITH CHECK (true);

-- Staff with branch access (or superadmin) can read
CREATE POLICY "Staff with branch access can read submissions"
  ON public.grading_payment_submissions
  FOR SELECT
  USING (public.has_branch_access(branch_id));

-- Only superadmin can update / delete
CREATE POLICY "Superadmin can update submissions"
  ON public.grading_payment_submissions
  FOR UPDATE
  USING (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin can delete submissions"
  ON public.grading_payment_submissions
  FOR DELETE
  USING (public.get_current_user_role() = 'superadmin');

-- Reference number generator (GP-YYYYMM-####)
CREATE OR REPLACE FUNCTION public.generate_grading_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period text := to_char(now(), 'YYYYMM');
  next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('gps-reference-' || current_period));
  SELECT COALESCE(MAX(NULLIF(substring(reference_number from '[0-9]+$'), '')::integer), 0) + 1
  INTO next_number
  FROM public.grading_payment_submissions
  WHERE reference_number LIKE 'GP-' || current_period || '-%';
  RETURN format('GP-%s-%s', current_period, lpad(next_number::text, 4, '0'));
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_grading_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR btrim(NEW.reference_number) = '' THEN
    NEW.reference_number := public.generate_grading_payment_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gps_assign_reference
  BEFORE INSERT ON public.grading_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.assign_grading_payment_reference();

CREATE TRIGGER trg_gps_updated_at
  BEFORE UPDATE ON public.grading_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public read RPC: returns only safe fields for the grading list page
CREATE OR REPLACE FUNCTION public.get_public_grading_list(
  p_branch_id text DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  source text,
  slot_id uuid,
  branch_id text,
  branch_name text,
  grading_date date,
  start_time time,
  end_time time,
  location text,
  student_name text,
  current_belt text,
  target_belt text,
  paid_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Matched registrations
  SELECT
    'registration'::text,
    gs.id,
    gs.branch_id,
    b.name,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))::text,
    gr.current_belt,
    gr.target_belt,
    CASE
      WHEN i.status IN ('paid','verified') THEN 'paid'
      WHEN i.status IS NULL THEN 'pending verification'
      ELSE 'pending verification'
    END
  FROM public.grading_registrations gr
  JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  LEFT JOIN public.branches b ON b.id = gs.branch_id
  JOIN public.students s ON s.id = gr.student_id
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  WHERE gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
    AND (p_to IS NULL OR gs.grading_date <= p_to)
    AND (p_branch_id IS NULL OR gs.branch_id = p_branch_id)

  UNION ALL

  -- Unmatched public submissions (no student linked yet)
  SELECT
    'submission'::text,
    gs.id,
    gps.branch_id,
    b.name,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    upper(gps.student_name)::text,
    gps.current_belt,
    NULL::text,
    CASE
      WHEN gps.status = 'verified' THEN 'paid'
      WHEN gps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  WHERE gps.matched_student_id IS NULL
    AND gps.status <> 'rejected'
    AND (gs.grading_date IS NULL
         OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
             AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)

  ORDER BY 5 NULLS LAST, 6 NULLS LAST, 4 NULLS LAST, 9;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_list(text, date, date) TO anon, authenticated;

-- Storage: allow anonymous upload to payment-proofs/public-grading/*
CREATE POLICY "Public can upload grading proof"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = 'public-grading'
  );

CREATE POLICY "Staff can read grading proof uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = 'public-grading'
  );
