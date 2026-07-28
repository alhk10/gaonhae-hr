ALTER TABLE public.seminar_events
  ADD COLUMN IF NOT EXISTS multi_package_discount boolean NOT NULL DEFAULT false;

ALTER TABLE public.seminar_payment_submissions
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.get_public_seminar_events();
CREATE OR REPLACE FUNCTION public.get_public_seminar_events()
 RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer, packages jsonb, indemnity_clause text, indemnity_template_url text, indemnity_template_name text, require_passport boolean, require_photo boolean, require_grading_card boolean, multi_package_discount boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.is_active, e.display_order,
         COALESCE(e.packages, '[]'::jsonb),
         e.indemnity_clause, e.indemnity_template_url, e.indemnity_template_name,
         e.require_passport, e.require_photo, e.require_grading_card,
         e.multi_package_discount
  FROM public.seminar_events e
  ORDER BY e.display_order, e.name;
$function$;

CREATE OR REPLACE FUNCTION public.admin_upsert_seminar_event(p_id uuid, p_name text, p_is_active boolean, p_display_order integer, p_packages jsonb, p_indemnity_clause text DEFAULT NULL::text, p_indemnity_template_url text DEFAULT NULL::text, p_indemnity_template_name text DEFAULT NULL::text, p_require_passport boolean DEFAULT false, p_require_photo boolean DEFAULT false, p_require_grading_card boolean DEFAULT false, p_multi_package_discount boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.seminar_events (
      name, is_active, display_order, packages, indemnity_clause,
      indemnity_template_url, indemnity_template_name,
      require_passport, require_photo, require_grading_card, multi_package_discount
    ) VALUES (
      btrim(p_name), COALESCE(p_is_active, true), COALESCE(p_display_order, 0),
      COALESCE(p_packages, '[]'::jsonb),
      NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      NULLIF(btrim(coalesce(p_indemnity_template_url,'')),''),
      NULLIF(btrim(coalesce(p_indemnity_template_name,'')),''),
      COALESCE(p_require_passport,false),
      COALESCE(p_require_photo,false),
      COALESCE(p_require_grading_card,false),
      COALESCE(p_multi_package_discount,false)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.seminar_events SET
      name = btrim(p_name),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      packages = COALESCE(p_packages, '[]'::jsonb),
      indemnity_clause = NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      indemnity_template_url = NULLIF(btrim(coalesce(p_indemnity_template_url,'')),''),
      indemnity_template_name = NULLIF(btrim(coalesce(p_indemnity_template_name,'')),''),
      require_passport = COALESCE(p_require_passport, require_passport),
      require_photo = COALESCE(p_require_photo, require_photo),
      require_grading_card = COALESCE(p_require_grading_card, require_grading_card),
      multi_package_discount = COALESCE(p_multi_package_discount, multi_package_discount),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_public_seminar_list(text, text, uuid);
CREATE OR REPLACE FUNCTION public.get_public_seminar_list(p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, first_name text, last_name text, date_of_birth date, gender text, current_belt text, package_code text, package_label text, session_dates date[], amount numeric, discount_amount numeric, proof_url text, status text, paid_status text, collected boolean, collected_at timestamp with time zone, matched_student_id uuid, matched_invoice_id uuid, invoice_number text, reference_number text, email text, created_at timestamp with time zone, event_id uuid, event_name text, passport_url text, photo_url text, grading_card_urls text[], signature_url text, indemnity_form_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.branch_id, b.name,
    upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    s.first_name, s.last_name, s.date_of_birth, s.gender, s.current_belt,
    s.package_code, s.package_label, s.session_dates, s.amount,
    COALESCE(s.discount_amount, 0),
    s.proof_url,
    s.status,
    CASE
      WHEN s.status = 'verified' THEN 'paid'
      WHEN s.status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    s.collected, s.collected_at,
    s.matched_student_id, s.matched_invoice_id, i.invoice_number,
    s.reference_number, s.email, s.created_at,
    s.event_id, e.name,
    s.passport_url, s.photo_url, COALESCE(s.grading_card_urls, '{}'::text[]),
    s.signature_url, s.indemnity_form_url
  FROM public.seminar_payment_submissions s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN public.invoices i ON i.id = s.matched_invoice_id
  LEFT JOIN public.seminar_events e ON e.id = s.event_id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_event_id IS NULL OR s.event_id = p_event_id)
    AND (p_status IS NULL OR
         (p_status = 'paid' AND s.status = 'verified') OR
         (p_status = 'pending' AND s.status = 'pending_verification') OR
         (p_status = 'rejected' AND s.status = 'rejected'))
  ORDER BY s.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.submit_seminar_payment(_row jsonb)
 RETURNS TABLE(id uuid, reference_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.seminar_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    gender, current_belt, package_code, package_label, session_dates,
    amount, discount_amount, payment_method, proof_url, status, event_id,
    passport_url, photo_url, grading_card_urls, signature_url, indemnity_form_url
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(lower(btrim(_row->>'gender')),''),
    NULLIF(_row->>'current_belt',''),
    _row->>'package_code',
    _row->>'package_label',
    COALESCE(
      ARRAY(SELECT (jsonb_array_elements_text(_row->'session_dates'))::date),
      '{}'::date[]
    ),
    (_row->>'amount')::numeric,
    COALESCE(NULLIF(_row->>'discount_amount','')::numeric, 0),
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    'pending_verification',
    NULLIF(_row->>'event_id','')::uuid,
    NULLIF(_row->>'passport_url',''),
    NULLIF(_row->>'photo_url',''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(_row->'grading_card_urls')),
      '{}'::text[]
    ),
    NULLIF(_row->>'signature_url',''),
    NULLIF(_row->>'indemnity_form_url','')
  )
  RETURNING seminar_payment_submissions.id, seminar_payment_submissions.reference_number;
END;
$function$;