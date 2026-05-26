
-- 1) Add kind column to products to tag competition products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kind text;

COMMENT ON COLUMN public.products.kind IS 'Optional product class tag: grading | competition | null';

-- 2) Competition payment submissions table (mirrors grading_payment_submissions, supports multi-product)
CREATE TABLE IF NOT EXISTS public.competition_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL DEFAULT (
    'COMP-' || to_char(now(), 'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 6)
  ),
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text,
  email text,
  branch_id text NOT NULL REFERENCES public.branches(id),
  date_of_birth date,
  current_belt text,
  coaching_product_id uuid REFERENCES public.products(id),
  category_product_ids uuid[] NOT NULL DEFAULT '{}',
  amount numeric(10,2),
  payment_method text NOT NULL CHECK (payment_method IN ('paynow','bank_transfer')),
  proof_url text NOT NULL,
  certificate_url text,
  status text NOT NULL DEFAULT 'pending_verification',
  matched_student_id uuid REFERENCES public.students(id),
  matched_invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_subs_branch ON public.competition_payment_submissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_comp_subs_status ON public.competition_payment_submissions(status);

ALTER TABLE public.competition_payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit competition payment"
  ON public.competition_payment_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff with branch access can read comp submissions"
  ON public.competition_payment_submissions FOR SELECT
  USING (has_branch_access(branch_id));

CREATE POLICY "Staff with branch access can update comp submissions"
  ON public.competition_payment_submissions FOR UPDATE
  USING (has_branch_access(branch_id))
  WITH CHECK (has_branch_access(branch_id));

CREATE POLICY "Superadmin can update comp submissions"
  ON public.competition_payment_submissions FOR UPDATE
  USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin can delete comp submissions"
  ON public.competition_payment_submissions FOR DELETE
  USING (get_current_user_role() = 'superadmin');

CREATE TRIGGER trg_comp_subs_updated_at
  BEFORE UPDATE ON public.competition_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RPCs

-- Submit (public)
CREATE OR REPLACE FUNCTION public.submit_competition_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.competition_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt, coaching_product_id, category_product_ids,
    amount, payment_method, proof_url, certificate_url, status
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'coaching_product_id','')::uuid,
    COALESCE(
      ARRAY(SELECT (jsonb_array_elements_text(_row->'category_product_ids'))::uuid),
      '{}'::uuid[]
    ),
    NULLIF(_row->>'amount','')::numeric,
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    NULLIF(_row->>'certificate_url',''),
    'pending_verification'
  )
  RETURNING competition_payment_submissions.id, competition_payment_submissions.reference_number;
END;
$$;

-- Public list for competitions tab
CREATE OR REPLACE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL)
RETURNS TABLE(
  submission_id uuid,
  branch_id text,
  branch_name text,
  student_name text,
  current_belt text,
  coaching_paid boolean,
  category_count integer,
  category_names text[],
  certificate_url text,
  proof_url text,
  status text,
  paid_status text,
  amount numeric,
  reference_number text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cps.id,
    cps.branch_id,
    b.name,
    upper(btrim(coalesce(cps.first_name,'') || ' ' || coalesce(cps.last_name,''))),
    cps.current_belt,
    (cps.coaching_product_id IS NOT NULL),
    COALESCE(array_length(cps.category_product_ids, 1), 0),
    COALESCE(
      (SELECT array_agg(p.name ORDER BY p.name)
       FROM public.products p
       WHERE p.id = ANY(cps.category_product_ids)),
      '{}'::text[]
    ),
    cps.certificate_url,
    cps.proof_url,
    cps.status,
    CASE
      WHEN cps.status = 'verified' THEN 'paid'
      WHEN cps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    cps.amount,
    cps.reference_number,
    cps.created_at
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$$;

-- Fuzzy match (mirrors grading)
CREATE OR REPLACE FUNCTION public.find_competition_submission_student_matches(p_id uuid)
RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub record;
  sub_name text;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (lower(coalesce(s.email,'')) = lower(coalesce(sub.email,'')) AND sub.email IS NOT NULL) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$$;

-- Match
CREATE OR REPLACE FUNCTION public.admin_match_competition_submission(p_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.competition_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Reject
CREATE OR REPLACE FUNCTION public.admin_reject_competition_submission(p_id uuid, p_reason text, p_reviewed_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.competition_payment_submissions
  SET status = 'rejected',
      notes = coalesce(p_reason, notes),
      reviewed_by = p_reviewed_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Import = create paid invoice with coaching + categories and a verified payment
CREATE OR REPLACE FUNCTION public.admin_import_competition_submission(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub record;
  v_invoice_id uuid;
  v_inv_number text;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  prod record;
  line_subtotal numeric;
  line_tax numeric;
  line_total numeric;
  cat_id uuid;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF sub.status = 'verified' THEN RAISE EXCEPTION 'Submission already verified'; END IF;

  v_inv_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    0, 0, 0, 0, 0, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public competition submission ' || sub.reference_number,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  -- Coaching line
  IF sub.coaching_product_id IS NOT NULL THEN
    SELECT id, name, base_price, tax_rate INTO prod FROM public.products WHERE id = sub.coaching_product_id;
    IF FOUND THEN
      line_subtotal := COALESCE(prod.base_price, 0);
      line_tax := round(line_subtotal * COALESCE(prod.tax_rate,0)/100, 2);
      line_total := line_subtotal + line_tax;
      INSERT INTO public.invoice_items (
        invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
      ) VALUES (
        v_invoice_id, prod.id, prod.name, 1, line_subtotal, COALESCE(prod.tax_rate,0), line_tax, line_total, p_verified_by, p_verified_by
      );
      v_subtotal := v_subtotal + line_subtotal;
      v_tax := v_tax + line_tax;
      v_total := v_total + line_total;
    END IF;
  END IF;

  -- Category lines
  FOREACH cat_id IN ARRAY COALESCE(sub.category_product_ids, '{}'::uuid[]) LOOP
    SELECT id, name, base_price, tax_rate INTO prod FROM public.products WHERE id = cat_id;
    IF FOUND THEN
      line_subtotal := COALESCE(prod.base_price, 0);
      line_tax := round(line_subtotal * COALESCE(prod.tax_rate,0)/100, 2);
      line_total := line_subtotal + line_tax;
      INSERT INTO public.invoice_items (
        invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
      ) VALUES (
        v_invoice_id, prod.id, prod.name, 1, line_subtotal, COALESCE(prod.tax_rate,0), line_tax, line_total, p_verified_by, p_verified_by
      );
      v_subtotal := v_subtotal + line_subtotal;
      v_tax := v_tax + line_tax;
      v_total := v_total + line_total;
    END IF;
  END LOOP;

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      total_amount = v_total,
      amount_paid = v_total,
      balance_due = 0
  WHERE id = v_invoice_id;

  -- Verified payment
  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_total, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public competition submission', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  );

  -- Store certificate on student if provided and empty
  IF sub.certificate_url IS NOT NULL THEN
    UPDATE public.students
    SET certificate_name = COALESCE(NULLIF(btrim(certificate_name),''), sub.certificate_url)
    WHERE id = sub.matched_student_id;
  END IF;

  UPDATE public.competition_payment_submissions
  SET status = 'verified',
      matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$$;

-- Edit RPCs
CREATE OR REPLACE FUNCTION public.admin_update_competition_submission_categories(p_id uuid, p_category_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.competition_payment_submissions
  SET category_product_ids = COALESCE(p_category_ids,'{}'::uuid[]), updated_at = now()
  WHERE id = p_id;
END;
$$;
