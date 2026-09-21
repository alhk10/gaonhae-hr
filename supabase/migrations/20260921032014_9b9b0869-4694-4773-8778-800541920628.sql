CREATE OR REPLACE FUNCTION public.record_proof_scan_by_session(
  p_session_id uuid,
  p_status text,
  p_amount numeric DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_session_id IS NULL THEN RETURN; END IF;
  IF p_status IS NULL OR p_status NOT IN ('match','mismatch','unreadable') THEN
    RAISE EXCEPTION 'Invalid scan status';
  END IF;

  SELECT s.id INTO v_id
  FROM public.public_chat_payment_submissions s
  WHERE s.session_id = p_session_id AND s.proof_scan_status IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN RETURN; END IF;

  UPDATE public.public_chat_payment_submissions
    SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
    WHERE id = v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_proof_scan_by_session(uuid, text, numeric, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_proof_scan_by_session(uuid, text, numeric, jsonb) TO anon, authenticated, service_role;