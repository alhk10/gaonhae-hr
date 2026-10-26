ALTER TABLE public.branch_timetables ADD COLUMN IF NOT EXISTS specific_dates date[];
ALTER TABLE public.branch_timetables ALTER COLUMN weekday DROP NOT NULL;

CREATE OR REPLACE FUNCTION public._branch_timetables_validate() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.specific_dates IS NOT NULL AND coalesce(array_length(NEW.specific_dates,1),0) = 0 THEN NEW.specific_dates := NULL; END IF;
  IF NEW.specific_dates IS NOT NULL THEN NEW.weekday := NULL; END IF;
  IF NEW.weekday IS NULL AND NEW.specific_dates IS NULL THEN
    RAISE EXCEPTION 'Choose a day or at least one specific date';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_branch_timetables_validate ON public.branch_timetables;
CREATE TRIGGER trg_branch_timetables_validate BEFORE INSERT OR UPDATE ON public.branch_timetables
  FOR EACH ROW EXECUTE FUNCTION public._branch_timetables_validate();

CREATE OR REPLACE FUNCTION public._timetable_runs_on(p_weekday int, p_dates date[], p_date date) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_dates IS NOT NULL THEN p_date = ANY(p_dates) ELSE EXTRACT(DOW FROM p_date)::int = p_weekday END
$$;

CREATE OR REPLACE FUNCTION public.access_timetable_upsert(p_password text, p_row jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid := NULLIF(p_row->>'id','')::uuid; v_branch text := p_row->>'branch_id'; v_old text; v_dates date[];
BEGIN
  IF v_id IS NOT NULL THEN
    SELECT branch_id INTO v_old FROM branch_timetables WHERE id = v_id;
    PERFORM public._access_branch_check(p_password, v_old);
  END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  v_dates := CASE WHEN jsonb_typeof(p_row->'specific_dates')='array' AND jsonb_array_length(p_row->'specific_dates') > 0
                  THEN ARRAY(SELECT DISTINCT d::date FROM jsonb_array_elements_text(p_row->'specific_dates') d ORDER BY 1) ELSE NULL END;
  IF (v_dates IS NULL AND (p_row->>'weekday') IS NULL) OR NULLIF(p_row->>'start_time','') IS NULL OR NULLIF(p_row->>'end_time','') IS NULL THEN
    RAISE EXCEPTION 'Day (or dates), start and end time are required';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO branch_timetables (branch_id, weekday, specific_dates, start_time, end_time, class_type, age_from, age_to, belt_levels, max_capacity, instructor_name, is_active, created_by, updated_by)
    VALUES (v_branch, CASE WHEN v_dates IS NULL THEN (p_row->>'weekday')::int END, v_dates, (p_row->>'start_time')::time, (p_row->>'end_time')::time, NULLIF(p_row->>'class_type',''),
            NULLIF(p_row->>'age_from','')::numeric, NULLIF(p_row->>'age_to','')::numeric,
            CASE WHEN jsonb_typeof(p_row->'belt_levels')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'belt_levels')) ELSE NULL END,
            coalesce(NULLIF(p_row->>'max_capacity','')::int, 20), NULLIF(p_row->>'instructor_name',''), coalesce((p_row->>'is_active')::boolean, true), 'access', 'access')
    RETURNING id INTO v_id;
  ELSE
    UPDATE branch_timetables SET branch_id = v_branch, weekday = CASE WHEN v_dates IS NULL THEN (p_row->>'weekday')::int END,
      specific_dates = v_dates, start_time = (p_row->>'start_time')::time,
      end_time = (p_row->>'end_time')::time, class_type = NULLIF(p_row->>'class_type',''),
      age_from = NULLIF(p_row->>'age_from','')::numeric, age_to = NULLIF(p_row->>'age_to','')::numeric,
      belt_levels = CASE WHEN jsonb_typeof(p_row->'belt_levels')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'belt_levels')) ELSE belt_levels END,
      max_capacity = coalesce(NULLIF(p_row->>'max_capacity','')::int, max_capacity), instructor_name = NULLIF(p_row->>'instructor_name',''),
      is_active = coalesce((p_row->>'is_active')::boolean, is_active), updated_by = 'access', updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.access_attendance_add(p_password text, p_timetable_id uuid, p_date date, p_student_id uuid, p_force boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_tt record; v_term record; v_bal record; v_id uuid; v_branch text;
BEGIN
  SELECT * INTO v_tt FROM branch_timetables WHERE id = p_timetable_id;
  IF v_tt.id IS NULL THEN RAISE EXCEPTION 'Timeslot not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_tt.branch_id);
  IF NOT public._timetable_runs_on(v_tt.weekday, v_tt.specific_dates, p_date) THEN RAISE EXCEPTION 'Date does not match this timeslot'; END IF;
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  SELECT t.id, t.start_date, t.end_date INTO v_term FROM term_calendars t
   WHERE t.branch_id = v_tt.branch_id AND p_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  SELECT * INTO v_bal FROM public._lesson_balance(p_student_id, v_tt.branch_id, coalesce(v_term.start_date, p_date), coalesce(v_term.end_date, p_date));
  IF NOT p_force AND NOT v_bal.unlimited AND v_bal.available <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'limit_reached', true, 'remaining', v_bal.remaining, 'pending', v_bal.pending);
  END IF;
  INSERT INTO lesson_bookings (student_id, branch_id, timetable_id, lesson_date, term_id, status, source, created_by, approved_by, approved_at)
  VALUES (p_student_id, v_tt.branch_id, v_tt.id, p_date, v_term.id, 'booked', 'staff', 'access', 'access', now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Student is already in this timeslot'; END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $function$;

CREATE OR REPLACE FUNCTION public.hello_submit_lesson_request(p_session_id uuid, p_student_id uuid, p_bookings jsonb, p_cancellations jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_branch text; v_b jsonb; v_date date; v_tt record; v_term record; v_bal record;
  v_booked int; v_n int := 0; v_c int := 0; v_new_by_term jsonb := '{}'::jsonb; v_key text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RAISE EXCEPTION 'Invalid chat session'; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  FOR v_b IN SELECT * FROM jsonb_array_elements(coalesce(p_cancellations,'[]'::jsonb)) LOOP
    UPDATE lesson_bookings SET cancel_requested = true, notes = coalesce(p_notes, notes)
     WHERE id = NULLIF(v_b->>'scheduled_class_id','')::uuid AND student_id = p_student_id
       AND status IN ('booked','requested') AND lesson_date >= current_date;
    IF FOUND THEN v_c := v_c + 1; END IF;
  END LOOP;
  FOR v_b IN SELECT * FROM jsonb_array_elements(coalesce(p_bookings,'[]'::jsonb)) LOOP
    v_date := NULLIF(v_b->>'date','')::date;
    SELECT * INTO v_tt FROM branch_timetables bt WHERE bt.id = NULLIF(v_b->>'timetable_id','')::uuid AND bt.branch_id = v_branch AND bt.is_active;
    IF v_date IS NULL OR v_tt.id IS NULL OR v_date < current_date THEN CONTINUE; END IF;
    IF NOT public._timetable_runs_on(v_tt.weekday, v_tt.specific_dates, v_date) THEN CONTINUE; END IF;
    SELECT t.id, t.start_date, t.end_date INTO v_term FROM term_calendars t
     WHERE t.branch_id = v_branch AND v_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
    IF v_term.id IS NULL THEN RAISE EXCEPTION 'No term found for %', to_char(v_date,'DD/MM/YYYY'); END IF;
    SELECT count(*) INTO v_booked FROM lesson_bookings WHERE timetable_id = v_tt.id AND lesson_date = v_date AND status <> 'rejected';
    IF v_booked >= coalesce(v_tt.max_capacity,999) THEN RAISE EXCEPTION 'The % class on % is full', to_char(v_tt.start_time,'HH24:MI'), to_char(v_date,'DD/MM/YYYY'); END IF;
    SELECT * INTO v_bal FROM public._lesson_balance(p_student_id, v_branch, v_term.start_date, v_term.end_date);
    v_key := v_term.id::text;
    IF NOT v_bal.unlimited AND v_bal.available + v_c <= coalesce((v_new_by_term->>v_key)::int,0) THEN
      RAISE EXCEPTION 'Lesson limit reached for this term. Please contact the branch to add more lessons.';
    END IF;
    INSERT INTO lesson_bookings (student_id, branch_id, timetable_id, lesson_date, term_id, status, source, notes, created_by)
    VALUES (p_student_id, v_branch, v_tt.id, v_date, v_term.id, 'requested', 'hello', p_notes, 'public_hello_chat')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_n := v_n + 1;
      v_new_by_term := v_new_by_term || jsonb_build_object(v_key, coalesce((v_new_by_term->>v_key)::int,0) + 1);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('requested', v_n, 'cancel_requested', v_c);
END $function$;

DROP FUNCTION IF EXISTS public.get_public_branch_timetable_slots(uuid, uuid);
CREATE FUNCTION public.get_public_branch_timetable_slots(p_session_id uuid, p_student_id uuid)
 RETURNS TABLE(id uuid, weekday integer, start_time time without time zone, end_time time without time zone, class_type text, max_capacity integer, specific_dates date[])
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_student RECORD; v_age integer; v_scopes text[];
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT s.date_of_birth, s.current_belt, s.branch_id INTO v_student FROM students s WHERE s.id = p_student_id;
  IF v_student IS NULL THEN RETURN; END IF;
  v_age := DATE_PART('year', AGE(v_student.date_of_birth))::integer;
  SELECT COALESCE(array_agg(DISTINCT NULLIF(class_type_scope,'')) FILTER (WHERE class_type_scope IS NOT NULL), ARRAY[]::text[])
    INTO v_scopes FROM entitlements WHERE student_id = p_student_id AND is_active = true;
  RETURN QUERY
  SELECT t.id, t.weekday, t.start_time, t.end_time, t.class_type, COALESCE(t.max_capacity, 999), t.specific_dates
  FROM branch_timetables t
  WHERE t.branch_id = v_student.branch_id AND t.is_active = true
    AND (t.age_from IS NULL OR v_age >= t.age_from)
    AND (t.age_to IS NULL OR v_age <= t.age_to)
    AND (t.belt_levels IS NULL OR array_length(t.belt_levels,1) IS NULL OR v_student.current_belt IS NULL OR v_student.current_belt = ANY(t.belt_levels))
    AND (array_length(v_scopes,1) IS NULL OR t.class_type = ANY(SELECT trim(unnest(string_to_array(s, ','))) FROM unnest(v_scopes) AS s));
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_branch_timetable_slots(uuid, uuid) TO anon, authenticated;