ALTER TABLE public.studio_rental_submissions
  ADD COLUMN IF NOT EXISTS is_commercial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS liability_cert_url text;

DROP FUNCTION IF EXISTS public.submit_studio_rental(text,text,text,text,text,text,jsonb,text,text,text,text);
CREATE FUNCTION public.submit_studio_rental(
  p_client_ref text, p_branch_id text, p_renter_name text, p_nric text, p_contact text, p_email text,
  p_sessions jsonb, p_agreement_text text, p_signature text, p_payment_method text, p_proof_url text,
  p_is_commercial boolean DEFAULT false, p_id_document_url text DEFAULT NULL, p_liability_cert_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q jsonb; v_existing record; v_sessions jsonb := '[]'::jsonb; s record; v_id uuid; v_ref text;
BEGIN
  IF p_client_ref IS NOT NULL THEN
    SELECT id, reference_number, total_amount INTO v_existing FROM public.studio_rental_submissions WHERE client_ref = p_client_ref;
    IF FOUND THEN RETURN jsonb_build_object('id',v_existing.id,'reference',v_existing.reference_number,'total_amount',v_existing.total_amount); END IF;
  END IF;
  IF length(trim(coalesce(p_renter_name,''))) < 2 OR length(p_renter_name) > 150 THEN RAISE EXCEPTION 'Please enter the renter name'; END IF;
  IF length(trim(coalesce(p_nric,''))) < 4 OR length(p_nric) > 30 THEN RAISE EXCEPTION 'Please enter a valid NRIC/UEN'; END IF;
  IF length(trim(coalesce(p_contact,''))) < 6 OR length(p_contact) > 30 THEN RAISE EXCEPTION 'Please enter a contact number'; END IF;
  IF coalesce(p_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email) > 255 THEN RAISE EXCEPTION 'Please enter a valid email'; END IF;
  IF coalesce(p_signature,'') NOT LIKE 'data:image/png;base64,%' OR length(p_signature) > 800000 THEN RAISE EXCEPTION 'Please sign the agreement'; END IF;
  IF length(coalesce(p_agreement_text,'')) < 200 OR length(p_agreement_text) > 20000 THEN RAISE EXCEPTION 'Agreement text missing'; END IF;
  IF p_payment_method NOT IN ('paynow','bank_transfer') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF coalesce(p_proof_url,'') = '' THEN RAISE EXCEPTION 'Please upload a screenshot of your payment'; END IF;
  IF coalesce(p_id_document_url,'') = '' THEN RAISE EXCEPTION 'Please upload your NRIC / FIN / Passport / ACRA Bizfile'; END IF;
  IF coalesce(p_is_commercial,false) AND coalesce(p_liability_cert_url,'') = '' THEN
    RAISE EXCEPTION 'Please upload your public liability insurance certificate';
  END IF;

  q := public._studio_rental_quote(p_branch_id, p_nric, p_email, p_sessions);
  FOR s IN SELECT e.value AS e FROM jsonb_array_elements(p_sessions) e LOOP
    v_sessions := v_sessions || jsonb_build_object('date',s.e->>'date','start',s.e->>'start','end',s.e->>'end',
      'hours', extract(epoch FROM ((s.e->>'end')::time - (s.e->>'start')::time))/3600.0);
  END LOOP;

  INSERT INTO public.studio_rental_submissions(client_ref,branch_id,renter_name,nric_uen,contact_number,email,sessions,total_hours,
    rental_amount,deposit_amount,gst_amount,total_amount,pricing,agreement_text,signature_data,payment_method,proof_url,
    is_commercial,id_document_url,liability_cert_url)
  VALUES (p_client_ref,p_branch_id,upper(trim(p_renter_name)),upper(trim(p_nric)),trim(p_contact),lower(trim(p_email)),v_sessions,
    (q->>'total_hours')::numeric,(q->>'rental_amount')::numeric,(q->>'deposit_amount')::numeric,(q->>'gst_amount')::numeric,
    (q->>'total_amount')::numeric,q,p_agreement_text,p_signature,p_payment_method,p_proof_url,
    coalesce(p_is_commercial,false), nullif(trim(coalesce(p_id_document_url,'')),''), nullif(trim(coalesce(p_liability_cert_url,'')),''))
  RETURNING id, reference_number INTO v_id, v_ref;
  RETURN jsonb_build_object('id',v_id,'reference',v_ref,'total_amount',(q->>'total_amount')::numeric);
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_studio_rental(text,text,text,text,text,text,jsonb,text,text,text,text,boolean,text,text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_studio_rental_list(text);
CREATE FUNCTION public.get_studio_rental_list(p_branch_id text DEFAULT NULL)
RETURNS TABLE(id uuid, reference_number text, branch_id text, branch_name text, renter_name text, nric_uen text, contact_number text,
  email text, sessions jsonb, total_hours numeric, rental_amount numeric, deposit_amount numeric, gst_amount numeric, total_amount numeric,
  payment_method text, proof_url text, status text, reviewed_by text, reviewed_at timestamptz, review_note text, signed_at timestamptz, created_at timestamptz,
  invoice_id uuid, invoice_number text, invoice_status text,
  is_commercial boolean, id_document_url text, liability_cert_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id,s.reference_number,s.branch_id,b.name,s.renter_name,s.nric_uen,s.contact_number,s.email,s.sessions,s.total_hours,
    s.rental_amount,s.deposit_amount,s.gst_amount,s.total_amount,s.payment_method,s.proof_url,s.status,s.reviewed_by,s.reviewed_at,
    s.review_note,s.signed_at,s.created_at, i.id, i.invoice_number, i.status,
    s.is_commercial, s.id_document_url, s.liability_cert_url
  FROM public.studio_rental_submissions s JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN public.invoices i ON i.id = s.invoice_id
  WHERE p_branch_id IS NULL OR s.branch_id = p_branch_id ORDER BY s.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_studio_rental_list(text) TO anon, authenticated;