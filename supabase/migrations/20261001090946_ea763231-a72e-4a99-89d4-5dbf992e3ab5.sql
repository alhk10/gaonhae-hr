CREATE OR REPLACE FUNCTION public._studio_rental_quote(p_branch_id text, p_nric text, p_email text, p_sessions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s record; cfg record; v_country text; v_rate_gst numeric := 0; v_inclusive boolean := true;
  v_months jsonb := '{}'::jsonb; v_month text; v_hours numeric; v_total_hours numeric := 0;
  v_rental numeric := 0; v_prev numeric; v_rate numeric; v_lines jsonb := '[]'::jsonb;
  v_deposit numeric := 0; v_gst numeric := 0; v_start time; v_end time; v_date date; k text;
BEGIN
  SELECT * INTO cfg FROM public.studio_rental_settings WHERE branch_id = p_branch_id AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio rental is not available at this branch'; END IF;
  SELECT lower(coalesce(country,'')) INTO v_country FROM public.branches WHERE id = p_branch_id;
  IF v_country IN ('singapore','sg') THEN v_rate_gst := 0.09;
  ELSIF v_country IN ('australia','au') THEN v_rate_gst := 0.10; END IF;

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

  -- Rates are GST-inclusive for all countries: extract the GST portion.
  v_gst := round(v_rental * v_rate_gst / (1 + v_rate_gst), 2);

  RETURN jsonb_build_object(
    'hourly_rate',cfg.hourly_rate,'discounted_rate',cfg.discounted_rate,'threshold',cfg.monthly_threshold_hours,
    'deposit_setting',cfg.deposit_amount,'months',v_lines,'total_hours',v_total_hours,
    'rental_amount',round(v_rental,2),'deposit_amount',v_deposit,'gst_rate',v_rate_gst,'gst_inclusive',true,
    'gst_amount',v_gst,'total_amount',round(v_rental + v_deposit,2));
END; $function$;