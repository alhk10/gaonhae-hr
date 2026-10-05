DROP FUNCTION public.get_public_grading_list(text, date, date);
CREATE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, registration_id uuid, slot_id uuid, branch_id text, branch_name text, branch_country text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text, result text, remark text, student_id uuid, certificate_name text, first_name text, last_name text, student_current_belt text, invoice_id uuid, invoice_status text, invoice_number text, scorecard jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT 'registration'::text, NULL::uuid, gr.id, gs.id,
    COALESCE(gr.branch_id, s.branch_id, gs.branch_id), COALESCE(bg.name, bs.name, b.name), COALESCE(bg.country, bs.country, b.country),
    gs.grading_date, gs.start_time, gs.end_time, gs.location, gs.title,
    COALESCE(NULLIF(btrim(gr.display_name), ''), NULLIF(btrim(s.display_name), ''), upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))))::text,
    gr.current_belt, gr.target_belt,
    CASE WHEN i.status IN ('paid','verified') THEN 'paid' ELSE 'pending verification' END,
    gps_src.amount, gps_src.proof_url, gr.result, gr.remark, s.id,
    COALESCE(NULLIF(btrim(s.certificate_name), ''), NULLIF(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), ''))::text,
    s.first_name, s.last_name, s.current_belt, ii.invoice_id, i.status, i.invoice_number, gr.scorecard::jsonb
  FROM public.grading_registrations gr
  JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  LEFT JOIN public.branches b ON b.id = gs.branch_id
  JOIN public.students s ON s.id = gr.student_id
  LEFT JOIN public.branches bs ON bs.id = s.branch_id
  LEFT JOIN public.branches bg ON bg.id = gr.branch_id
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  LEFT JOIN LATERAL (SELECT amount, proof_url FROM public.grading_payment_submissions WHERE matched_invoice_id = ii.invoice_id ORDER BY created_at DESC LIMIT 1) gps_src ON TRUE
  WHERE gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
    AND (p_to IS NULL OR gs.grading_date <= p_to)
    AND (p_branch_id IS NULL OR COALESCE(gr.branch_id, s.branch_id, gs.branch_id) = p_branch_id)
  UNION ALL
  SELECT 'submission'::text, gps.id, NULL::uuid, gs.id, gps.branch_id, b.name, b.country,
    gs.grading_date, gs.start_time, gs.end_time, gs.location, gs.title,
    COALESCE(NULLIF(btrim(gps.display_name), ''), upper(btrim(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,''))))::text,
    gps.current_belt, NULL::text,
    CASE WHEN gps.status = 'verified' THEN 'paid' WHEN gps.status = 'rejected' THEN 'rejected' ELSE 'pending verification' END,
    gps.amount, gps.proof_url, gps.result, gps.remark, gps.matched_student_id, NULL::text,
    gps.first_name, gps.last_name, s2.current_belt, gps.matched_invoice_id, NULL::text, NULL::text, NULL::jsonb
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  LEFT JOIN public.students s2 ON s2.id = gps.matched_student_id
  WHERE gps.status <> 'rejected' AND gps.matched_invoice_id IS NULL
    AND (gs.grading_date IS NULL OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days') AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)
  ORDER BY 8 NULLS LAST, 9 NULLS LAST, 6 NULLS LAST, 13;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_grading_list(text, date, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_grading_scorecard(p_registration_id uuid, p_label text, p_value text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r record; arr jsonb; found boolean := false; i int; elem jsonb;
  p numeric; b numeric; k numeric; h numeric; avg numeric; cnt int; res text;
  num_of text;
BEGIN
  SELECT gr.id, gr.scorecard, gr.result_manual_override, COALESCE(bg.name, bs.name, bsl.name) AS branch_name
    INTO r
  FROM grading_registrations gr
  JOIN grading_slots gs ON gs.id = gr.grading_slot_id
  JOIN students s ON s.id = gr.student_id
  LEFT JOIN branches bg ON bg.id = gr.branch_id
  LEFT JOIN branches bs ON bs.id = s.branch_id
  LEFT JOIN branches bsl ON bsl.id = gs.branch_id
  WHERE gr.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grading record not found'; END IF;
  IF lower(coalesce(r.branch_name,'')) <> 'morley' THEN RAISE EXCEPTION 'Score entry is only enabled for Morley'; END IF;
  IF length(coalesce(p_label,'')) = 0 OR length(p_label) > 40 OR length(coalesce(p_value,'')) > 20 THEN RAISE EXCEPTION 'Invalid score'; END IF;

  arr := CASE WHEN jsonb_typeof(r.scorecard::jsonb) = 'array' THEN r.scorecard::jsonb ELSE '[]'::jsonb END;
  FOR i IN 0 .. jsonb_array_length(arr) - 1 LOOP
    IF lower(arr->i->>'label') = lower(p_label) THEN
      arr := jsonb_set(arr, ARRAY[i::text], jsonb_build_object('label', p_label, 'value', coalesce(p_value,'')));
      found := true;
    END IF;
  END LOOP;
  IF NOT found THEN arr := arr || jsonb_build_array(jsonb_build_object('label', p_label, 'value', coalesce(p_value,''))); END IF;

  SELECT (substring(e->>'value' from '-?\d+(?:\.\d+)?'))::numeric INTO p FROM jsonb_array_elements(arr) e WHERE lower(e->>'label')='poomsae' LIMIT 1;
  SELECT (substring(e->>'value' from '-?\d+(?:\.\d+)?'))::numeric INTO b FROM jsonb_array_elements(arr) e WHERE lower(e->>'label')='balchagi' LIMIT 1;
  SELECT (substring(e->>'value' from '-?\d+(?:\.\d+)?'))::numeric INTO k FROM jsonb_array_elements(arr) e WHERE lower(e->>'label')='kyorugi' LIMIT 1;
  SELECT (substring(e->>'value' from '-?\d+(?:\.\d+)?'))::numeric INTO h FROM jsonb_array_elements(arr) e WHERE lower(e->>'label')='hoshinsul' LIMIT 1;

  IF NOT coalesce(r.result_manual_override, false) AND p IS NOT NULL AND b IS NOT NULL THEN
    IF k IS NOT NULL AND h IS NOT NULL THEN avg := (p+b+k+h)/4;
    ELSIF k IS NOT NULL THEN avg := (p+b+k)/3;
    ELSE avg := (p+b)/2; END IF;
    res := CASE WHEN avg <= 5.9 THEN 'fail' WHEN avg < 8.0 THEN 'pass' ELSE 'double' END;
    UPDATE grading_registrations SET scorecard = arr, result = res WHERE id = p_registration_id;
  ELSE
    UPDATE grading_registrations SET scorecard = arr WHERE id = p_registration_id;
  END IF;
  RETURN jsonb_build_object('scorecard', arr, 'result', res);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_update_grading_scorecard(uuid, text, text) TO anon, authenticated;