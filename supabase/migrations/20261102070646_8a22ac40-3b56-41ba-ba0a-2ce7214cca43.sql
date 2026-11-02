CREATE OR REPLACE FUNCTION public._perth_check_pw(p_password text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF encode(extensions.digest('perth:' || coalesce(p_password,''), 'sha256'), 'hex') <> 'a2bb9799b8f6e10ef9b3a7cf0cf647dbcc894941415e27b19c36f34b5f33d42d' THEN
    RAISE EXCEPTION 'Invalid password'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_perth_upsert_registration(p_password text, p_id uuid, p jsonb, p_override_cap boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_first text := upper(trim(coalesce(p->>'first_name','')));
  v_last text := upper(trim(coalesce(p->>'last_name','')));
  v_dob date := nullif(p->>'date_of_birth','')::date;
  v_grade text := p->>'grade';
  v_sem text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(p->'seminars','[]')));
  v_ev text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(p->'comp_events','[]')));
  v_student text := nullif(p->>'student_id','');
  v_age int; v_div text; v_price numeric; v_id uuid; v_s text; v_cnt int; v_cap int;
BEGIN
  PERFORM _perth_check_pw(p_password);
  IF v_first='' OR v_last='' OR v_dob IS NULL THEN RAISE EXCEPTION 'Name and date of birth are required'; END IF;
  IF coalesce(p->>'gender','') NOT IN ('male','female') THEN RAISE EXCEPTION 'Gender is required'; END IF;
  IF v_grade NOT IN ('foundation','poomdan','g1','g2','g3','g4','g5','g6','g7','g8','g9','g10') THEN RAISE EXCEPTION 'Invalid grade'; END IF;
  IF cardinality(v_sem)+cardinality(v_ev)=0 THEN RAISE EXCEPTION 'Select at least one seminar or event'; END IF;
  IF cardinality(v_ev) > 2 THEN RAISE EXCEPTION 'Maximum of 2 competition events'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_sem) x WHERE x NOT IN ('ps1','ks1','ps2','ks2')) THEN RAISE EXCEPTION 'Unknown seminar'; END IF;
  IF v_student IS NOT NULL AND NOT EXISTS (SELECT 1 FROM students WHERE id::text=v_student) THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF EXISTS (SELECT 1 FROM perth_event_registrations WHERE first_name=v_first AND last_name=v_last AND date_of_birth=v_dob AND (p_id IS NULL OR id<>p_id)) THEN
    RAISE EXCEPTION 'DUPLICATE: this participant is already registered, edit the existing entry instead'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('perth_event_registrations'));
  IF NOT p_override_cap THEN
    IF cardinality(v_ev)>0 THEN
      SELECT count(*) INTO v_cnt FROM perth_event_registrations WHERE status<>'rejected' AND cardinality(comp_events)>0 AND (p_id IS NULL OR id<>p_id);
      IF v_cnt >= 100 THEN RAISE EXCEPTION 'CAP: The competition is full (100)'; END IF;
    END IF;
    FOREACH v_s IN ARRAY v_sem LOOP
      v_cap := CASE v_s WHEN 'ps2' THEN 50 ELSE 30 END;
      SELECT count(*) INTO v_cnt FROM perth_event_registrations WHERE status<>'rejected' AND v_s=ANY(seminars) AND (p_id IS NULL OR id<>p_id);
      IF v_cnt >= v_cap THEN RAISE EXCEPTION 'CAP: % is full (%)', v_s, v_cap; END IF;
    END LOOP;
  END IF;

  v_age := 2026 - extract(year FROM v_dob)::int;
  v_div := CASE WHEN cardinality(v_ev)=0 THEN NULL WHEN v_age<=6 THEN '5-6' WHEN v_age<=8 THEN '7-8' WHEN v_age<=11 THEN '9-11'
                WHEN v_age<=14 THEN '12-14' WHEN v_age<=17 THEN '15-17' ELSE '18+' END;
  v_price := CASE WHEN v_student IS NOT NULL THEN 40 ELSE 45 END;

  IF p_id IS NULL THEN
    INSERT INTO perth_event_registrations(client_ref, first_name,last_name,gender,date_of_birth,club,grade,email,phone,seminars,comp_events,age_division,
      is_gaonhae_student,student_id,unit_price,total_amount,proof_url,signature_data_url)
    VALUES ('staff-'||gen_random_uuid(), v_first,v_last,p->>'gender',v_dob,trim(coalesce(p->>'club','')),v_grade,lower(trim(coalesce(p->>'email',''))),trim(coalesce(p->>'phone','')),
      v_sem,v_ev,v_div,v_student IS NOT NULL,v_student,v_price,v_price*(cardinality(v_sem)+cardinality(v_ev)),nullif(p->>'proof_url',''),'manual-entry')
    RETURNING id INTO v_id;
  ELSE
    UPDATE perth_event_registrations SET first_name=v_first,last_name=v_last,gender=p->>'gender',date_of_birth=v_dob,club=trim(coalesce(p->>'club','')),
      grade=v_grade,email=lower(trim(coalesce(p->>'email',''))),phone=trim(coalesce(p->>'phone','')),seminars=v_sem,comp_events=v_ev,age_division=v_div,
      is_gaonhae_student=v_student IS NOT NULL,student_id=v_student,unit_price=v_price,total_amount=v_price*(cardinality(v_sem)+cardinality(v_ev)),
      proof_url=coalesce(nullif(p->>'proof_url',''),proof_url),
      proof_scan_status=CASE WHEN nullif(p->>'proof_url','') IS NOT NULL THEN NULL ELSE proof_scan_status END
    WHERE id=p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Registration not found'; END IF;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_perth_set_proof(p_password text, p_id uuid, p_proof_url text, p_status text DEFAULT NULL, p_amount numeric DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _perth_check_pw(p_password);
  IF p_status IS NOT NULL AND p_status NOT IN ('match','mismatch','unreadable') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE perth_event_registrations SET proof_url=coalesce(nullif(p_proof_url,''),proof_url), proof_scan_status=p_status, proof_scan_amount=p_amount, proof_scan_details=p_details WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_perth_search_students(p_password text, p_query text)
RETURNS TABLE(id uuid, student_number text, first_name text, last_name text, date_of_birth date, current_belt text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _perth_check_pw(p_password);
  RETURN QUERY SELECT s.id, s.student_number::text, s.first_name::text, s.last_name::text, s.date_of_birth, s.current_belt::text, s.status::text
  FROM students s WHERE length(trim(coalesce(p_query,'')))>=2 AND (
    (s.first_name||' '||s.last_name) ILIKE '%'||trim(p_query)||'%' OR coalesce(s.display_name,'') ILIKE '%'||trim(p_query)||'%' OR coalesce(s.student_number::text,'') ILIKE '%'||trim(p_query)||'%')
  ORDER BY s.first_name, s.last_name LIMIT 20;
END $$;

REVOKE ALL ON FUNCTION public._perth_check_pw(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_perth_upsert_registration(text,uuid,jsonb,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_perth_set_proof(text,uuid,text,text,numeric,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_perth_search_students(text,text) TO anon, authenticated;