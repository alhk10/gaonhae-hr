CREATE OR REPLACE FUNCTION public.get_perth_event_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'competition_left', 100 - (SELECT count(*) FROM perth_event_registrations WHERE status <> 'rejected' AND cardinality(comp_events) > 0),
    'seminars', jsonb_build_object(
      'ps1', 30 - (SELECT count(*) FROM perth_event_registrations WHERE status <> 'rejected' AND 'ps1' = ANY(seminars)),
      'ks1', 30 - (SELECT count(*) FROM perth_event_registrations WHERE status <> 'rejected' AND 'ks1' = ANY(seminars)),
      'ps2', 50 - (SELECT count(*) FROM perth_event_registrations WHERE status <> 'rejected' AND 'ps2' = ANY(seminars)),
      'ks2', 30 - (SELECT count(*) FROM perth_event_registrations WHERE status <> 'rejected' AND 'ks2' = ANY(seminars))
    ),
    'competition_closed', (now() AT TIME ZONE 'Australia/Perth') > timestamp '2026-11-06 23:59'
  )
$$;

CREATE OR REPLACE FUNCTION public.submit_perth_event_registration(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text := nullif(p->>'client_ref','');
  v_existing uuid;
  v_first text := upper(trim(coalesce(p->>'first_name','')));
  v_last text := upper(trim(coalesce(p->>'last_name','')));
  v_dob date := (p->>'date_of_birth')::date;
  v_grade text := p->>'grade';
  v_rank int;
  v_age int;
  v_sem text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(p->'seminars','[]')));
  v_ev text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(p->'comp_events','[]')));
  v_s text; v_e text; v_div text; v_student text; v_price numeric := 45; v_id uuid;
  v_cnt int;
  v_cap int;
BEGIN
  IF v_ref IS NOT NULL THEN
    SELECT id INTO v_existing FROM perth_event_registrations WHERE client_ref = v_ref;
    IF v_existing IS NOT NULL THEN
      RETURN (SELECT jsonb_build_object('id',id,'total_amount',total_amount,'unit_price',unit_price,'is_gaonhae_student',is_gaonhae_student,'duplicate',true) FROM perth_event_registrations WHERE id=v_existing);
    END IF;
  END IF;
  IF v_first = '' OR v_last = '' OR v_dob IS NULL THEN RAISE EXCEPTION 'Name and date of birth are required'; END IF;
  IF coalesce(p->>'gender','') NOT IN ('male','female') THEN RAISE EXCEPTION 'Gender is required'; END IF;
  IF coalesce(trim(p->>'club'),'') = '' OR coalesce(trim(p->>'email'),'') = '' OR coalesce(trim(p->>'phone'),'') = '' THEN
    RAISE EXCEPTION 'Club, email and mobile are required'; END IF;
  IF v_grade NOT IN ('foundation','poomdan','g1','g2','g3','g4','g5','g6','g7','g8','g9','g10') THEN RAISE EXCEPTION 'Invalid grade'; END IF;
  IF cardinality(v_sem) + cardinality(v_ev) = 0 THEN RAISE EXCEPTION 'Select at least one seminar or event'; END IF;
  IF cardinality(v_ev) > 2 THEN RAISE EXCEPTION 'Maximum of 2 competition events'; END IF;
  IF coalesce(p->>'proof_url','') = '' THEN RAISE EXCEPTION 'Proof of payment is required'; END IF;
  IF coalesce(p->>'signature_data_url','') = '' THEN RAISE EXCEPTION 'Signature is required'; END IF;

  v_rank := _perth_grade_rank(v_grade);
  v_age := 2026 - extract(year FROM v_dob)::int;

  FOREACH v_s IN ARRAY v_sem LOOP
    IF v_s = 'ps1' AND NOT (v_age >= 7 AND v_rank BETWEEN 4 AND 9) THEN RAISE EXCEPTION 'Not eligible for Poomsae Seminar 1';
    ELSIF v_s = 'ks1' AND NOT (v_age >= 7 AND v_rank BETWEEN 4 AND 9) THEN RAISE EXCEPTION 'Not eligible for Kyorugi Seminar 1';
    ELSIF v_s = 'ps2' AND NOT (v_age >= 7 AND v_rank = 10) THEN RAISE EXCEPTION 'Not eligible for Poomsae Seminar 2';
    ELSIF v_s = 'ks2' AND NOT (v_age >= 10 AND v_rank >= 8) THEN RAISE EXCEPTION 'Not eligible for Kyorugi Seminar 2';
    ELSIF v_s NOT IN ('ps1','ks1','ps2','ks2') THEN RAISE EXCEPTION 'Unknown seminar';
    END IF;
  END LOOP;

  IF cardinality(v_ev) > 0 THEN
    IF (now() AT TIME ZONE 'Australia/Perth') > timestamp '2026-11-06 23:59' THEN RAISE EXCEPTION 'Competition registration closed on 6 November 2026'; END IF;
    IF v_rank < 0 THEN RAISE EXCEPTION 'Foundation (non-geup) competitors cannot enter the competition'; END IF;
    IF v_age < 4 THEN RAISE EXCEPTION 'Competitors must be at least 4 years old (by birth year)'; END IF;
    FOREACH v_e IN ARRAY v_ev LOOP
      IF v_e IN ('pd_t7','pd_t8','pd_koryo','pd_keumgang','pd_taebaek') THEN
        IF v_rank <> 10 THEN RAISE EXCEPTION 'Poom/Dan events are for Poom/Dan holders only'; END IF;
      ELSIF v_e ~ '^g([1-9]|10)$' THEN
        IF v_rank = 10 THEN RAISE EXCEPTION 'Poom/Dan holders may only enter Poom/Dan events'; END IF;
        IF _perth_grade_rank(v_e) < v_rank THEN RAISE EXCEPTION 'Cannot enter events below your current grade'; END IF;
      ELSE RAISE EXCEPTION 'Unknown event';
      END IF;
    END LOOP;
    v_div := CASE WHEN v_age <= 6 THEN '4-6' WHEN v_age <= 8 THEN '7-8' WHEN v_age <= 11 THEN '9-11'
                  WHEN v_age <= 14 THEN '12-14' WHEN v_age <= 17 THEN '15-17' ELSE '18+' END;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('perth_event_registrations'));
  IF cardinality(v_ev) > 0 THEN
    SELECT count(*) INTO v_cnt FROM perth_event_registrations WHERE status <> 'rejected' AND cardinality(comp_events) > 0;
    IF v_cnt >= 100 THEN RAISE EXCEPTION 'The competition is full (100 participants)'; END IF;
  END IF;
  FOREACH v_s IN ARRAY v_sem LOOP
    v_cap := CASE v_s WHEN 'ps1' THEN 30 WHEN 'ks1' THEN 30 WHEN 'ps2' THEN 50 WHEN 'ks2' THEN 30 END;
    SELECT count(*) INTO v_cnt FROM perth_event_registrations WHERE status <> 'rejected' AND v_s = ANY(seminars);
    IF v_cnt >= v_cap THEN RAISE EXCEPTION 'A selected seminar is full (%)', v_cap; END IF;
  END LOOP;

  IF coalesce((p->>'is_gaonhae_student')::boolean, false) THEN
    SELECT s.id::text INTO v_student FROM students s
      WHERE upper(trim(s.first_name)) = v_first AND upper(trim(s.last_name)) = v_last
       AND s.date_of_birth BETWEEN v_dob - 1 AND v_dob + 1
       AND lower(coalesce(s.status,'')) IN ('active','trial')
     LIMIT 1;
    IF v_student IS NOT NULL THEN v_price := 40; END IF;
  END IF;

  INSERT INTO perth_event_registrations(client_ref, first_name, last_name, gender, date_of_birth, club, grade, email, phone,
    seminars, comp_events, age_division, is_gaonhae_student, student_id, unit_price, total_amount, proof_url, signature_data_url)
  VALUES (v_ref, v_first, v_last, p->>'gender', v_dob, trim(p->>'club'), v_grade, lower(trim(p->>'email')), trim(p->>'phone'),
    v_sem, v_ev, v_div, v_student IS NOT NULL, v_student, v_price, v_price * (cardinality(v_sem)+cardinality(v_ev)),
    p->>'proof_url', p->>'signature_data_url')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'unit_price', v_price, 'total_amount', v_price * (cardinality(v_sem)+cardinality(v_ev)),
    'is_gaonhae_student', v_student IS NOT NULL, 'duplicate', false);
END $$;

REVOKE ALL ON FUNCTION public.submit_perth_event_registration(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_perth_event_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_perth_event_registration(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_perth_event_availability() TO anon, authenticated, service_role;