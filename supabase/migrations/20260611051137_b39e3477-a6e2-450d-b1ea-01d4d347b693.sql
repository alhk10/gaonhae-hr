
ALTER TABLE public.competition_events
  ADD COLUMN IF NOT EXISTS coaching_label text,
  ADD COLUMN IF NOT EXISTS coaching_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS extra_lines jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS coaching_label text,
  ADD COLUMN IF NOT EXISTS coaching_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS extra_lines jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.admin_upsert_competition_event(uuid, text, boolean, integer, uuid, text, boolean, boolean, boolean, uuid[]);
DROP FUNCTION IF EXISTS public.get_public_competition_events();

CREATE OR REPLACE FUNCTION public.admin_upsert_competition_event(
  p_id uuid,
  p_name text,
  p_is_active boolean,
  p_display_order integer,
  p_indemnity_clause text,
  p_require_indemnity_form boolean,
  p_require_passport boolean,
  p_require_photo boolean,
  p_coaching_label text,
  p_coaching_amount numeric,
  p_extra_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.competition_events (
      name, is_active, display_order,
      indemnity_clause, require_indemnity_form, require_passport, require_photo,
      coaching_label, coaching_amount, extra_lines
    ) VALUES (
      btrim(p_name), COALESCE(p_is_active,true), COALESCE(p_display_order,0),
      NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      COALESCE(p_require_indemnity_form,false),
      COALESCE(p_require_passport,false),
      COALESCE(p_require_photo,false),
      NULLIF(btrim(coalesce(p_coaching_label,'')),''),
      COALESCE(p_coaching_amount, 0),
      COALESCE(p_extra_lines, '[]'::jsonb)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.competition_events SET
      name = btrim(p_name),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      indemnity_clause = NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      require_indemnity_form = COALESCE(p_require_indemnity_form, require_indemnity_form),
      require_passport = COALESCE(p_require_passport, require_passport),
      require_photo = COALESCE(p_require_photo, require_photo),
      coaching_label = NULLIF(btrim(coalesce(p_coaching_label,'')),''),
      coaching_amount = COALESCE(p_coaching_amount, 0),
      extra_lines = COALESCE(p_extra_lines, '[]'::jsonb),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_competition_events()
RETURNS TABLE(
  id uuid, name text, is_active boolean, display_order integer,
  indemnity_clause text,
  require_indemnity_form boolean, require_passport boolean, require_photo boolean,
  coaching_label text, coaching_amount numeric, extra_lines jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    e.id, e.name, e.is_active, e.display_order,
    e.indemnity_clause,
    e.require_indemnity_form, e.require_passport, e.require_photo,
    e.coaching_label, COALESCE(e.coaching_amount, 0), COALESCE(e.extra_lines, '[]'::jsonb)
  FROM public.competition_events e
  ORDER BY e.display_order, e.name;
$function$;

CREATE OR REPLACE FUNCTION public.submit_competition_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.competition_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt,
    amount, payment_method, proof_url, certificate_url, status,
    event_id, gender, signature_url, indemnity_form_url, passport_url, photo_url,
    coaching_label, coaching_amount, extra_lines
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'amount','')::numeric,
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    NULLIF(_row->>'certificate_url',''),
    'pending_verification',
    NULLIF(_row->>'event_id','')::uuid,
    NULLIF(lower(btrim(_row->>'gender')),''),
    NULLIF(_row->>'signature_url',''),
    NULLIF(_row->>'indemnity_form_url',''),
    NULLIF(_row->>'passport_url',''),
    NULLIF(_row->>'photo_url',''),
    NULLIF(_row->>'coaching_label',''),
    NULLIF(_row->>'coaching_amount','')::numeric,
    COALESCE(_row->'extra_lines', '[]'::jsonb)
  )
  RETURNING competition_payment_submissions.id, competition_payment_submissions.reference_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_import_competition_submission(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  ev record;
  v_invoice_id uuid;
  v_inv_number text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_event_name text;
  v_main_amount numeric;
  v_line jsonb;
  v_label text;
  v_amount numeric;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF sub.status = 'verified' THEN RAISE EXCEPTION 'Submission already verified'; END IF;

  SELECT * INTO ev FROM public.competition_events WHERE id = sub.event_id;
  v_event_name := COALESCE(ev.name, sub.coaching_label, 'Competition Registration');

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

  v_main_amount := COALESCE(sub.coaching_amount, 0);
  IF v_main_amount > 0 THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
    ) VALUES (
      v_invoice_id, NULL, v_event_name, 1, v_main_amount, 0, 0, v_main_amount, p_verified_by, p_verified_by
    );
    v_subtotal := v_subtotal + v_main_amount;
    v_total := v_total + v_main_amount;
  END IF;

  IF jsonb_typeof(COALESCE(sub.extra_lines, '[]'::jsonb)) = 'array' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(sub.extra_lines) LOOP
      v_label := NULLIF(btrim(coalesce(v_line->>'label','')),'');
      v_amount := COALESCE(NULLIF(v_line->>'amount','')::numeric, 0);
      IF v_amount > 0 OR v_label IS NOT NULL THEN
        INSERT INTO public.invoice_items (
          invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
        ) VALUES (
          v_invoice_id, NULL,
          v_event_name || COALESCE(' - ' || v_label, ''),
          1, v_amount, 0, 0, v_amount,
          p_verified_by, p_verified_by
        );
        v_subtotal := v_subtotal + v_amount;
        v_total := v_total + v_amount;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax_amount = 0,
      total_amount = v_total,
      amount_paid = v_total,
      balance_due = 0
  WHERE id = v_invoice_id;

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_total, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public competition submission', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  );

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
$function$;
