CREATE OR REPLACE FUNCTION public._studio_rental_quote(p_branch_id text, p_nric text, p_email text, p_sessions jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; cfg record; v_country text; v_rate_gst numeric := 0; v_inclusive boolean := false;
  v_months jsonb := '{}'::jsonb; v_month text; v_hours numeric; v_total_hours numeric := 0;
  v_rental numeric := 0; v_prev numeric; v_rate numeric; v_lines jsonb := '[]'::jsonb;
  v_deposit numeric := 0; v_gst numeric := 0; v_start time; v_end time; v_date date; k text;
BEGIN
  SELECT * INTO cfg FROM public.studio_rental_settings WHERE branch_id = p_branch_id AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio rental is not available at this branch'; END IF;
  SELECT lower(coalesce(country,'')) INTO v_country FROM public.branches WHERE id = p_branch_id;
  IF v_country IN ('singapore','sg') THEN v_rate_gst := 0.09;
  ELSIF v_country IN ('australia','au') THEN v_rate_gst := 0.10; v_inclusive := true; END IF;

  IF jsonb_typeof(p_sessions) <> 'array' OR jsonb_array_length(p_sessions) = 0 OR jsonb_array_length(p_sessions) > 60 THEN
    RAISE EXCEPTION 'Add at least one session';
  END IF;
  FOR s IN SELECT e.value AS e FROM jsonb_array_elements(p_sessions) e LOOP
    v_date := (s.e->>'date')::date; v_start := (s.e->>'start')::time; v_end := (s.e->>'end')::time;
    IF v_date < CURRENT_DATE THEN RAISE EXCEPTION 'Session dates must not be in the past'; END IF;
    v_hours := extract(epoch FROM (v_end - v_start)) / 3600.0;
    IF v_hours < 1 THEN RAISE EXCEPTION 'Each session must be at least 1 hour'; END IF;
    IF (v_hours * 2) <> floor(v_hours * 2) OR extract(minute FROM v_start)::int % 30 <> 0 THEN
      RAISE EXCEPTION 'Sessions must be in 30-minute steps';
    END IF;
    v_month := to_char(v_date,'YYYY-MM');
    v_months := jsonb_set(v_months, ARRAY[v_month], to_jsonb(coalesce((v_months->>v_month)::numeric,0) + v_hours));
    v_total_hours := v_total_hours + v_hours;
  END LOOP;

  FOR k IN SELECT jsonb_object_keys(v_months) LOOP
    v_hours := (v_months->>k)::numeric;
    SELECT coalesce(sum((x->>'hours')::numeric),0) INTO v_prev
      FROM public.studio_rental_submissions sub, jsonb_array_elements(sub.sessions) x
     WHERE sub.branch_id = p_branch_id AND sub.status <> 'rejected'
       AND (upper(trim(sub.nric_uen)) = upper(trim(p_nric)) OR lower(trim(sub.email)) = lower(trim(p_email)))
       AND to_char((x->>'date')::date,'YYYY-MM') = k;
    v_rate := CASE WHEN v_prev + v_hours > cfg.monthly_threshold_hours THEN cfg.discounted_rate ELSE cfg.hourly_rate END;
    v_rental := v_rental + v_hours * v_rate;
    v_lines := v_lines || jsonb_build_object('month',k,'hours',v_hours,'previous_hours',v_prev,'rate',v_rate,'amount',v_hours*v_rate);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.studio_rental_submissions sub WHERE sub.status <> 'rejected'
     AND (upper(trim(sub.nric_uen)) = upper(trim(p_nric)) OR lower(trim(sub.email)) = lower(trim(p_email)))) THEN
    v_deposit := cfg.deposit_amount;
  END IF;

  IF v_inclusive THEN v_gst := round(v_rental * v_rate_gst / (1 + v_rate_gst), 2);
  ELSE v_gst := round(v_rental * v_rate_gst, 2); END IF;

  RETURN jsonb_build_object(
    'hourly_rate',cfg.hourly_rate,'discounted_rate',cfg.discounted_rate,'threshold',cfg.monthly_threshold_hours,
    'deposit_setting',cfg.deposit_amount,'months',v_lines,'total_hours',v_total_hours,
    'rental_amount',round(v_rental,2),'deposit_amount',v_deposit,'gst_rate',v_rate_gst,'gst_inclusive',v_inclusive,
    'gst_amount',v_gst,'total_amount',round(v_rental + CASE WHEN v_inclusive THEN 0 ELSE v_gst END + v_deposit,2));
END; $$;

CREATE OR REPLACE FUNCTION public.submit_studio_rental(
  p_client_ref text, p_branch_id text, p_renter_name text, p_nric text, p_contact text, p_email text,
  p_sessions jsonb, p_agreement_text text, p_signature text, p_payment_method text, p_proof_url text)
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

  q := public._studio_rental_quote(p_branch_id, p_nric, p_email, p_sessions);
  FOR s IN SELECT e.value AS e FROM jsonb_array_elements(p_sessions) e LOOP
    v_sessions := v_sessions || jsonb_build_object('date',s.e->>'date','start',s.e->>'start','end',s.e->>'end',
      'hours', extract(epoch FROM ((s.e->>'end')::time - (s.e->>'start')::time))/3600.0);
  END LOOP;

  INSERT INTO public.studio_rental_submissions(client_ref,branch_id,renter_name,nric_uen,contact_number,email,sessions,total_hours,
    rental_amount,deposit_amount,gst_amount,total_amount,pricing,agreement_text,signature_data,payment_method,proof_url)
  VALUES (p_client_ref,p_branch_id,upper(trim(p_renter_name)),upper(trim(p_nric)),trim(p_contact),lower(trim(p_email)),v_sessions,
    (q->>'total_hours')::numeric,(q->>'rental_amount')::numeric,(q->>'deposit_amount')::numeric,(q->>'gst_amount')::numeric,
    (q->>'total_amount')::numeric,q,p_agreement_text,p_signature,p_payment_method,p_proof_url)
  RETURNING id, reference_number INTO v_id, v_ref;
  RETURN jsonb_build_object('id',v_id,'reference',v_ref,'total_amount',(q->>'total_amount')::numeric);
END; $$;
REVOKE EXECUTE ON FUNCTION public._studio_rental_quote(text,text,text,jsonb) FROM public, anon, authenticated;