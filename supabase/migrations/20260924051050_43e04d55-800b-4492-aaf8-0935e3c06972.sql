CREATE OR REPLACE FUNCTION public.submit_submission_edit_request(p_source text, p_record_id uuid, p_student_name text DEFAULT NULL::text, p_reference_number text DEFAULT NULL::text, p_amount numeric DEFAULT NULL::numeric, p_proposed_changes jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text, p_requested_by text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_exists boolean;
BEGIN
  IF p_source NOT IN ('grading', 'competition', 'seminar', 'guards', 'school_fees') THEN
    RAISE EXCEPTION 'Unknown source %', p_source;
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)',
    CASE p_source
      WHEN 'grading' THEN 'grading_payment_submissions'
      WHEN 'competition' THEN 'competition_payment_submissions'
      WHEN 'seminar' THEN 'seminar_payment_submissions'
      WHEN 'guards' THEN 'guards_purchases'
      WHEN 'school_fees' THEN 'public_chat_payment_submissions'
    END
  ) INTO v_exists USING p_record_id;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  SELECT id INTO v_id FROM public.submission_edit_requests
  WHERE source = p_source AND record_id = p_record_id AND status = 'pending'
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.submission_edit_requests (
    source, record_id, student_name, reference_number, amount,
    proposed_changes, reason, requested_by
  ) VALUES (
    p_source, p_record_id, p_student_name, p_reference_number, p_amount,
    COALESCE(p_proposed_changes, '{}'::jsonb), p_reason, p_requested_by
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_submission_edit_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.submission_edit_requests%ROWTYPE;
  v_amount numeric;
  v_email text;
  v_phone text;
BEGIN
  SELECT * INTO v_req FROM public.submission_edit_requests WHERE id = p_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already reviewed';
  END IF;

  v_amount := NULLIF(v_req.proposed_changes->>'amount', '')::numeric;
  v_email := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'email', '')), '');
  v_phone := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'phone', '')), '');

  IF v_req.source = 'grading' THEN
    UPDATE public.grading_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'competition' THEN
    UPDATE public.competition_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'guards' THEN
    UPDATE public.guards_purchases
       SET total = coalesce(v_amount, total),
           email = coalesce(v_email, email),
           phone = coalesce(v_phone, phone),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'school_fees' THEN
    UPDATE public.public_chat_payment_submissions
       SET amount = coalesce(v_amount, amount)
     WHERE id = v_req.record_id;
  END IF;

  UPDATE public.submission_edit_requests
     SET status = 'approved', reviewed_at = now(), reviewed_by = 'superadmin', updated_at = now()
   WHERE id = p_id;
END;
$function$;