CREATE OR REPLACE FUNCTION public.get_invoice_pending_requests(p_invoice_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'edit_pending', EXISTS (SELECT 1 FROM invoice_action_requests WHERE invoice_id = p_invoice_id AND status='pending' AND action_type='adjustment'),
    'delete_pending', EXISTS (SELECT 1 FROM invoice_deletion_requests WHERE invoice_id = p_invoice_id AND status='pending'));
$$;

CREATE OR REPLACE FUNCTION public.submit_access_invoice_deletion_request(p_invoice_id uuid, p_reason text, p_actor text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = p_invoice_id) THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF COALESCE(btrim(p_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  IF EXISTS (SELECT 1 FROM invoice_deletion_requests WHERE invoice_id = p_invoice_id AND status='pending') THEN
    RAISE EXCEPTION 'A delete request is already pending for this invoice';
  END IF;
  INSERT INTO invoice_deletion_requests(invoice_id, requested_by, requested_by_email, reason, status)
  VALUES (p_invoice_id, COALESCE(auth.uid()::text, 'access'), COALESCE(NULLIF(p_actor,''), 'access portal'), left(btrim(p_reason), 500), 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_access_invoice_edit_request(p_invoice_id uuid, p_note text, p_actor text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_num text; v_name text;
BEGIN
  SELECT i.invoice_number, COALESCE(NULLIF(btrim(s.first_name||' '||COALESCE(s.last_name,'')),''), '')
    INTO v_num, v_name FROM invoices i LEFT JOIN students s ON s.id = i.student_id WHERE i.id = p_invoice_id;
  IF v_num IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF COALESCE(btrim(p_note),'') = '' THEN RAISE EXCEPTION 'Please describe the change'; END IF;
  IF EXISTS (SELECT 1 FROM invoice_action_requests WHERE invoice_id = p_invoice_id AND status='pending' AND action_type='adjustment') THEN
    RAISE EXCEPTION 'An edit request is already pending for this invoice';
  END IF;
  INSERT INTO invoice_action_requests(invoice_id, action_type, request_data, requested_by, requested_by_email, invoice_number, student_name, status)
  VALUES (p_invoice_id, 'adjustment', jsonb_build_object('note', left(btrim(p_note), 1000), 'source', 'access_portal'),
          auth.uid()::text, COALESCE(NULLIF(p_actor,''), 'access portal'), v_num, v_name, 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_invoice_pending_requests(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_access_invoice_deletion_request(uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_access_invoice_edit_request(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_pending_requests(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_access_invoice_deletion_request(uuid,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_access_invoice_edit_request(uuid,text,text) TO anon, authenticated, service_role;