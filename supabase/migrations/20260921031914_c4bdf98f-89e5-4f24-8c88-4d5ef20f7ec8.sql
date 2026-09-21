CREATE OR REPLACE FUNCTION public.record_proof_scan(
  p_source text,
  p_id uuid,
  p_status text,
  p_amount numeric DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_id IS NULL THEN RETURN; END IF;
  IF p_status IS NULL OR p_status NOT IN ('match','mismatch','unreadable') THEN
    RAISE EXCEPTION 'Invalid scan status';
  END IF;

  IF p_source = 'grading' THEN
    UPDATE public.grading_payment_submissions
      SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
      WHERE id = p_id AND proof_scan_status IS NULL;
  ELSIF p_source = 'competition' THEN
    UPDATE public.competition_payment_submissions
      SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
      WHERE id = p_id AND proof_scan_status IS NULL;
  ELSIF p_source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions
      SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
      WHERE id = p_id AND proof_scan_status IS NULL;
  ELSIF p_source = 'school_fees' THEN
    UPDATE public.public_chat_payment_submissions
      SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
      WHERE id = p_id AND proof_scan_status IS NULL;
  ELSIF p_source = 'guards' THEN
    UPDATE public.guards_purchases
      SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
      WHERE id = p_id AND proof_scan_status IS NULL;
  ELSE
    RAISE EXCEPTION 'Invalid scan source';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_proof_scan(text, uuid, text, numeric, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_proof_scan(text, uuid, text, numeric, jsonb) TO anon, authenticated, service_role;