ALTER TABLE public.perth_event_registrations
  ADD COLUMN IF NOT EXISTS proof_scan_status text,
  ADD COLUMN IF NOT EXISTS proof_scan_amount numeric,
  ADD COLUMN IF NOT EXISTS proof_scan_details jsonb;

CREATE OR REPLACE FUNCTION public.check_perth_gaonhae_student(p_first text, p_last text, p_dob date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM students s
    WHERE upper(trim(s.first_name)) = upper(trim(p_first))
      AND upper(trim(s.last_name)) = upper(trim(p_last))
      AND s.date_of_birth BETWEEN p_dob - 1 AND p_dob + 1
      AND lower(coalesce(s.status,'')) IN ('active','trial'));
$$;

CREATE OR REPLACE FUNCTION public.record_perth_proof_scan(p_id uuid, p_client_ref text, p_status text, p_amount numeric, p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('match','mismatch','unreadable') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE perth_event_registrations SET proof_scan_status = p_status, proof_scan_amount = p_amount, proof_scan_details = p_details
   WHERE id = p_id AND client_ref = p_client_ref AND proof_scan_status IS NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.check_perth_gaonhae_student(text, text, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_perth_proof_scan(uuid, text, text, numeric, jsonb) TO anon, authenticated, service_role;