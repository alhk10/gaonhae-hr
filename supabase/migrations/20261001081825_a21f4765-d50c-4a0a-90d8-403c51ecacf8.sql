CREATE TABLE public.studio_rental_settings (
  branch_id text PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  hourly_rate numeric NOT NULL DEFAULT 60,
  discounted_rate numeric NOT NULL DEFAULT 45,
  monthly_threshold_hours numeric NOT NULL DEFAULT 10,
  deposit_amount numeric NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.studio_rental_settings TO service_role;
ALTER TABLE public.studio_rental_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.studio_rental_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE DEFAULT ('SR-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5))),
  client_ref text UNIQUE,
  branch_id text NOT NULL REFERENCES public.branches(id),
  renter_name text NOT NULL,
  nric_uen text NOT NULL,
  contact_number text NOT NULL,
  email text NOT NULL,
  sessions jsonb NOT NULL,
  total_hours numeric NOT NULL,
  rental_amount numeric NOT NULL,
  deposit_amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  pricing jsonb,
  agreement_text text NOT NULL,
  signature_data text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL DEFAULT 'paynow',
  proof_url text,
  status text NOT NULL DEFAULT 'pending_verification',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.studio_rental_submissions TO service_role;
ALTER TABLE public.studio_rental_submissions ENABLE ROW LEVEL SECURITY;

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
  FOR s IN SELECT * FROM jsonb_array_elements(p_sessions) e LOOP
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

CREATE OR REPLACE FUNCTION public.get_studio_rental_settings()
RETURNS TABLE(branch_id text, branch_name text, country text, enabled boolean, hourly_rate numeric, discounted_rate numeric, monthly_threshold_hours numeric, deposit_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.name, b.country, coalesce(s.enabled,false), coalesce(s.hourly_rate,60), coalesce(s.discounted_rate,45),
         coalesce(s.monthly_threshold_hours,10), coalesce(s.deposit_amount,200)
  FROM public.branches b LEFT JOIN public.studio_rental_settings s ON s.branch_id = b.id
  WHERE b.name NOT IN ('Competition','Headquarters','Centralised Grading') ORDER BY b.name;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_studio_rental_settings(p_branch_id text, p_enabled boolean, p_hourly numeric, p_discounted numeric, p_threshold numeric, p_deposit numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_hourly < 0 OR p_discounted < 0 OR p_threshold < 0 OR p_deposit < 0 THEN RAISE EXCEPTION 'Values must not be negative'; END IF;
  INSERT INTO public.studio_rental_settings(branch_id,enabled,hourly_rate,discounted_rate,monthly_threshold_hours,deposit_amount)
  VALUES (p_branch_id,p_enabled,p_hourly,p_discounted,p_threshold,p_deposit)
  ON CONFLICT (branch_id) DO UPDATE SET enabled=EXCLUDED.enabled, hourly_rate=EXCLUDED.hourly_rate,
    discounted_rate=EXCLUDED.discounted_rate, monthly_threshold_hours=EXCLUDED.monthly_threshold_hours,
    deposit_amount=EXCLUDED.deposit_amount, updated_at=now();
END; $$;

CREATE OR REPLACE FUNCTION public.quote_studio_rental(p_branch_id text, p_nric text, p_email text, p_sessions jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public._studio_rental_quote(p_branch_id, p_nric, p_email, p_sessions);
$$;

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
  FOR s IN SELECT * FROM jsonb_array_elements(p_sessions) e LOOP
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

CREATE OR REPLACE FUNCTION public.get_studio_rental_list(p_branch_id text DEFAULT NULL)
RETURNS TABLE(id uuid, reference_number text, branch_id text, branch_name text, renter_name text, nric_uen text, contact_number text,
  email text, sessions jsonb, total_hours numeric, rental_amount numeric, deposit_amount numeric, gst_amount numeric, total_amount numeric,
  payment_method text, proof_url text, status text, reviewed_by text, reviewed_at timestamptz, review_note text, signed_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id,s.reference_number,s.branch_id,b.name,s.renter_name,s.nric_uen,s.contact_number,s.email,s.sessions,s.total_hours,
    s.rental_amount,s.deposit_amount,s.gst_amount,s.total_amount,s.payment_method,s.proof_url,s.status,s.reviewed_by,s.reviewed_at,
    s.review_note,s.signed_at,s.created_at
  FROM public.studio_rental_submissions s JOIN public.branches b ON b.id = s.branch_id
  WHERE p_branch_id IS NULL OR s.branch_id = p_branch_id ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_rental_agreement(p_id uuid)
RETURNS TABLE(agreement_text text, signature_data text, signed_at timestamptz, renter_name text, reference_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agreement_text, signature_data, signed_at, renter_name, reference_number FROM public.studio_rental_submissions WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_studio_rental(p_id uuid, p_status text, p_by text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('verified','rejected','pending_verification') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.studio_rental_submissions SET status=p_status, reviewed_by=left(coalesce(p_by,'access'),100),
    reviewed_at=now(), review_note=left(p_note,500), updated_at=now() WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rental not found'; END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_studio_rental_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_studio_rental(text,text,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_studio_rental(text,text,text,text,text,text,jsonb,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_studio_rental_list(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_studio_rental_agreement(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_studio_rental(uuid,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_studio_rental_settings(text,boolean,numeric,numeric,numeric,numeric) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._studio_rental_quote(text,text,text,jsonb) FROM public, anon, authenticated;

INSERT INTO public.studio_rental_settings(branch_id) SELECT id FROM public.branches WHERE lower(name) LIKE '%yishun%' ON CONFLICT DO NOTHING;