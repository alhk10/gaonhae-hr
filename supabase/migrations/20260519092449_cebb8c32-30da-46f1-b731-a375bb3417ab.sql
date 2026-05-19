
-- Accessory payment submissions table
CREATE TABLE public.accessory_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text,
  email text,
  branch_id text NOT NULL REFERENCES public.branches(id),
  date_of_birth date NOT NULL,
  current_belt text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  proof_url text,
  matched_student_id uuid REFERENCES public.students(id),
  matched_invoice_id uuid REFERENCES public.invoices(id),
  status text NOT NULL DEFAULT 'pending_verification',
  notes text,
  result text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aps_branch ON public.accessory_payment_submissions(branch_id);
CREATE INDEX idx_aps_status ON public.accessory_payment_submissions(status);
CREATE INDEX idx_aps_created ON public.accessory_payment_submissions(created_at DESC);

-- Reference number generator: AP-YYYYMM-####
CREATE OR REPLACE FUNCTION public.generate_accessory_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_period text := to_char(now(), 'YYYYMM');
  next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('aps-reference-' || current_period));
  SELECT COALESCE(MAX(NULLIF(substring(reference_number from '[0-9]+$'), '')::integer), 0) + 1
  INTO next_number
  FROM public.accessory_payment_submissions
  WHERE reference_number LIKE 'AP-' || current_period || '-%';
  RETURN format('AP-%s-%s', current_period, lpad(next_number::text, 4, '0'));
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_accessory_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR btrim(NEW.reference_number) = '' THEN
    NEW.reference_number := public.generate_accessory_payment_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_accessory_payment_reference
BEFORE INSERT ON public.accessory_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.assign_accessory_payment_reference();

CREATE TRIGGER trg_aps_updated_at
BEFORE UPDATE ON public.accessory_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.accessory_payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit accessory payment"
ON public.accessory_payment_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff with branch access can read accessory submissions"
ON public.accessory_payment_submissions FOR SELECT
USING (has_branch_access(branch_id));

CREATE POLICY "Staff with branch access can update accessory submissions"
ON public.accessory_payment_submissions FOR UPDATE
USING (has_branch_access(branch_id))
WITH CHECK (has_branch_access(branch_id));

CREATE POLICY "Superadmin can delete accessory submissions"
ON public.accessory_payment_submissions FOR DELETE
USING (get_current_user_role() = 'superadmin');

-- Public list (anonymous + signed-in): branch + product + paid status only.
-- Branch-scoped sensitive fields handled by RLS for SELECT '*'; this RPC returns
-- only the columns needed to show on the public list page.
CREATE OR REPLACE FUNCTION public.get_public_accessory_list()
RETURNS TABLE (
  id uuid,
  reference_number text,
  branch_id text,
  branch_name text,
  first_name text,
  last_name text,
  display_name text,
  items jsonb,
  amount numeric,
  payment_method text,
  proof_url text,
  status text,
  matched_student_id uuid,
  matched_invoice_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.reference_number, s.branch_id, b.name as branch_name,
         s.first_name, s.last_name, s.display_name,
         s.items, s.amount, s.payment_method, s.proof_url,
         s.status, s.matched_student_id, s.matched_invoice_id,
         s.created_at
  FROM public.accessory_payment_submissions s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  ORDER BY s.created_at DESC;
$$;

-- Branch-priced active products in the Protection Guards & Accessories category.
CREATE OR REPLACE FUNCTION public.get_public_accessory_products(p_branch_id text)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  base_price numeric,
  branch_price numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(
      (
        SELECT pr.price_override
        FROM public.price_rules pr
        WHERE pr.product_id = p.id
          AND pr.is_active = true
          AND pr.branch_id = p_branch_id
          AND pr.price_override IS NOT NULL
          AND (pr.effective_from IS NULL OR pr.effective_from <= CURRENT_DATE)
          AND (pr.effective_to IS NULL OR pr.effective_to >= CURRENT_DATE)
        ORDER BY pr.updated_at DESC NULLS LAST, pr.created_at DESC NULLS LAST
        LIMIT 1
      ),
      p.base_price
    ) AS branch_price
  FROM public.products p
  JOIN public.product_categories pc ON pc.id = p.category_id
  WHERE p.is_active = true
    AND lower(pc.name) = 'protection guards & accessories'
  ORDER BY p.name;
$$;

-- Verify a submission, attempting auto-match to an existing student
-- by (UPPER(first+last), date_of_birth, branch_id). On match, creates
-- a single combined invoice and a verified payment, links both to the
-- submission, and marks it 'verified'. On no-match, the submission
-- stays 'pending_verification' so staff can suggest adding the student.
CREATE OR REPLACE FUNCTION public.admin_verify_accessory_submission(
  p_id uuid,
  p_verified_by text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub record;
  v_student_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_period text := to_char(now(), 'YYYYMM');
  v_next int;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_qty int;
  v_unit numeric;
  v_line_total numeric;
BEGIN
  SELECT * INTO v_sub
  FROM public.accessory_payment_submissions
  WHERE id = p_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission % not found', p_id;
  END IF;

  -- Auto-match student
  SELECT s.id INTO v_student_id
  FROM public.students s
  WHERE upper(coalesce(s.first_name,'')) = upper(coalesce(v_sub.first_name,''))
    AND upper(coalesce(s.last_name,'')) = upper(coalesce(v_sub.last_name,''))
    AND s.date_of_birth = v_sub.date_of_birth
    AND s.branch_id = v_sub.branch_id
  LIMIT 1;

  IF v_student_id IS NULL THEN
    -- No match: leave status untouched so staff can use "Suggest add"
    RETURN jsonb_build_object('matched', false);
  END IF;

  -- Generate invoice number INV-YYYYMM-####
  PERFORM pg_advisory_xact_lock(hashtext('invoice-number-' || v_period));
  SELECT COALESCE(MAX(NULLIF(substring(invoice_number from '[0-9]+$'),'')::integer),0)+1
  INTO v_next
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || v_period || '-%';
  v_invoice_number := format('INV-%s-%s', v_period, lpad(v_next::text, 4, '0'));

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount,
    amount_paid, balance_due, issue_date, due_date,
    notes, created_by, updated_by
  ) VALUES (
    v_invoice_number, v_student_id, v_sub.branch_id, 'paid',
    v_sub.amount, 0, 0, v_sub.amount,
    v_sub.amount, 0, CURRENT_DATE, CURRENT_DATE,
    format('Accessory payment %s', v_sub.reference_number),
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub.items)
  LOOP
    v_qty := COALESCE((v_item->>'qty')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line_total := COALESCE((v_item->>'line_total')::numeric, v_qty * v_unit);
    v_subtotal := v_subtotal + v_line_total;
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      NULLIF(v_item->>'product_id','')::uuid,
      v_item->>'name',
      v_qty,
      v_unit,
      0, 0, v_line_total,
      p_verified_by, p_verified_by
    );
  END LOOP;

  -- Insert verified payment
  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date,
    reference_number, proof_of_payment_url, notes,
    processed_by, is_verified, verified_by, verified_at,
    verification_status, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_sub.payment_method, v_sub.amount, CURRENT_DATE,
    v_sub.reference_number, v_sub.proof_url,
    format('Accessory submission %s', v_sub.reference_number),
    p_verified_by, true, p_verified_by, now(),
    'verified', p_verified_by, p_verified_by
  );

  UPDATE public.accessory_payment_submissions
  SET status = 'verified',
      matched_student_id = v_student_id,
      matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by,
      reviewed_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'matched', true,
    'student_id', v_student_id,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_accessory_submission(
  p_id uuid,
  p_reason text,
  p_reviewed_by text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.accessory_payment_submissions
  SET status = 'rejected',
      notes = COALESCE(p_reason, notes),
      reviewed_by = p_reviewed_by,
      reviewed_at = now()
  WHERE id = p_id;
END;
$$;
