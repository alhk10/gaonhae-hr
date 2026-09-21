-- 1. Scan columns on payments (for /hello payments which have no submission row)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

CREATE OR REPLACE FUNCTION public.record_proof_scan_for_invoice(
  p_session_id uuid,
  p_invoice_id uuid,
  p_status text,
  p_amount numeric,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_status IS NULL OR p_invoice_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.public_chat_sessions s
    WHERE s.id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  UPDATE public.payments
  SET proof_scan_status = p_status,
      proof_scan_amount = p_amount,
      proof_scan_details = p_details,
      updated_at = now()
  WHERE invoice_id = p_invoice_id
    AND created_by = 'public_hello_chat'
    AND payment_method <> 'credit';
END;
$function$;

REVOKE ALL ON FUNCTION public.record_proof_scan_for_invoice(uuid, uuid, text, numeric, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_proof_scan_for_invoice(uuid, uuid, text, numeric, jsonb) TO anon, authenticated, service_role;

-- 2. Idempotency keys for competition / seminar submissions
ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS client_ref text;
ALTER TABLE public.seminar_payment_submissions
  ADD COLUMN IF NOT EXISTS client_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS competition_payment_submissions_client_ref_key
  ON public.competition_payment_submissions (client_ref) WHERE client_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS seminar_payment_submissions_client_ref_key
  ON public.seminar_payment_submissions (client_ref) WHERE client_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_competition_payment(_row jsonb)
 RETURNS TABLE(id uuid, reference_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text := NULLIF(btrim(_row->>'client_ref'), '');
  v_id uuid;
  v_number text;
BEGIN
  IF v_ref IS NOT NULL THEN
    SELECT s.id, s.reference_number INTO v_id, v_number
    FROM public.competition_payment_submissions s
    WHERE s.client_ref = v_ref
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_number;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.competition_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt,
    amount, payment_method, proof_url, certificate_url, status,
    event_id, gender, signature_url, indemnity_form_url, passport_url, photo_url,
    coaching_label, coaching_amount, extra_lines, client_ref
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
    COALESCE(_row->'extra_lines', '[]'::jsonb),
    v_ref
  )
  RETURNING competition_payment_submissions.id, competition_payment_submissions.reference_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_seminar_payment(_row jsonb)
 RETURNS TABLE(id uuid, reference_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text := NULLIF(btrim(_row->>'client_ref'), '');
  v_id uuid;
  v_number text;
BEGIN
  IF v_ref IS NOT NULL THEN
    SELECT s.id, s.reference_number INTO v_id, v_number
    FROM public.seminar_payment_submissions s
    WHERE s.client_ref = v_ref
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_number;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.seminar_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    gender, current_belt, package_code, package_label, session_dates,
    amount, discount_amount, payment_method, proof_url, status, event_id,
    passport_url, photo_url, grading_card_urls, signature_url, indemnity_form_url,
    client_ref
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
    NULLIF(_row->>'indemnity_form_url',''),
    v_ref
  )
  RETURNING seminar_payment_submissions.id, seminar_payment_submissions.reference_number;
END;
$function$;
