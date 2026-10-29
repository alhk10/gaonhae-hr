CREATE OR REPLACE FUNCTION public._grading_ready_state(p_student_id uuid, p_term_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'ready', coalesce(bool_or(gr.ready_for_grading), false),
    'paid', coalesce(bool_or(EXISTS (SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
              WHERE ii.id = gr.invoice_item_id AND lower(coalesce(i.status,'')) IN ('paid','verified'))), false))
  FROM grading_registrations gr
  WHERE gr.student_id = p_student_id AND p_term_id IS NOT NULL AND gr.term_id = p_term_id;
$$;
REVOKE ALL ON FUNCTION public._grading_ready_state(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_set_ready_for_grading(p_password text, p_student_id uuid, p_term_id uuid, p_ready boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch text; v_belt text; v_state jsonb;
BEGIN
  SELECT branch_id, current_belt INTO v_branch, v_belt FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF p_term_id IS NULL THEN RAISE EXCEPTION 'No term for this date'; END IF;
  v_state := public._grading_ready_state(p_student_id, p_term_id);
  IF NOT p_ready AND (v_state->>'paid')::boolean THEN RAISE EXCEPTION 'Grading already paid'; END IF;
  IF EXISTS (SELECT 1 FROM grading_registrations WHERE student_id = p_student_id AND term_id = p_term_id) THEN
    UPDATE grading_registrations SET ready_for_grading = p_ready WHERE student_id = p_student_id AND term_id = p_term_id;
  ELSIF p_ready THEN
    INSERT INTO grading_registrations (student_id, term_id, branch_id, current_belt, target_belt, ready_for_grading, created_by)
    VALUES (p_student_id, p_term_id, v_branch, coalesce(v_belt,'No belt'), coalesce(v_belt,'No belt'), true, 'access_attendance');
  END IF;
  RETURN public._grading_ready_state(p_student_id, p_term_id);
END $$;
GRANT EXECUTE ON FUNCTION public.access_set_ready_for_grading(text, uuid, uuid, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hello_grading_eligibility(p_session_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch text; v_term uuid;
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  PERFORM public._validate_public_chat_session(p_session_id, p_student_id, v_branch);
  SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND current_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  IF v_term IS NULL THEN
    SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND t.start_date <= current_date ORDER BY t.start_date DESC LIMIT 1;
  END IF;
  RETURN public._grading_ready_state(p_student_id, v_term) || jsonb_build_object('term_id', v_term);
END $$;
GRANT EXECUTE ON FUNCTION public.hello_grading_eligibility(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_attendance_week(p_password text, p_branch_id text, p_week_start date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_end date := p_week_start + 6; v_country text;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  SELECT country INTO v_country FROM branches WHERE id = p_branch_id;
  RETURN jsonb_build_object(
    'slots', coalesce((SELECT jsonb_agg(to_jsonb(bt) ORDER BY bt.weekday, bt.start_time) FROM branch_timetables bt
                        WHERE bt.branch_id = p_branch_id AND bt.is_active), '[]'::jsonb),
    'holidays', coalesce((SELECT jsonb_agg(jsonb_build_object('date', h.date, 'name', h.name)) FROM public_holidays h
                        WHERE h.date BETWEEN p_week_start AND v_end AND (h.country IS NULL OR v_country IS NULL OR lower(h.country) = lower(v_country))), '[]'::jsonb),
    'terms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'start_date', t.start_date, 'end_date', t.end_date))
                        FROM term_calendars t WHERE t.branch_id = p_branch_id AND t.start_date <= v_end AND t.end_date >= p_week_start), '[]'::jsonb),
    'breaks', coalesce((SELECT jsonb_agg(jsonb_build_object('name', b.name, 'start_date', b.start_date, 'end_date', b.end_date))
                        FROM term_breaks b JOIN term_calendars t ON t.id = b.term_id
                        WHERE t.branch_id = p_branch_id AND b.start_date <= v_end AND b.end_date >= p_week_start), '[]'::jsonb),
    'bookings', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', x.id, 'student_id', x.student_id, 'timetable_id', x.timetable_id, 'lesson_date', x.lesson_date,
          'start_time', x.start_time, 'end_time', x.end_time, 'class_type', x.class_type,
          'status', x.status, 'source', x.source, 'cancel_requested', x.cancel_requested, 'notes', x.notes,
          'created_at', x.created_at, 'student_name', x.student_name,
          'current_belt', x.current_belt, 'date_of_birth', x.date_of_birth, 'student_status', x.student_status,
          'term_id', x.tid,
          'term_payment', public._term_payment_status(x.student_id, x.tid),
          'grading', public._grading_ready_state(x.student_id, x.tid))
          ORDER BY x.first_name, x.last_name)
        FROM (SELECT lb.*, s.first_name, s.last_name, s.current_belt, s.date_of_birth, s.status AS student_status,
                upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))) AS student_name,
                coalesce(lb.term_id, (SELECT t.id FROM term_calendars t WHERE t.branch_id = p_branch_id AND lb.lesson_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1)) AS tid
              FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
              WHERE lb.branch_id = p_branch_id AND lb.lesson_date BETWEEN p_week_start AND v_end AND lb.status <> 'rejected') x), '[]'::jsonb),
    'requests', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', lb.id, 'lesson_date', lb.lesson_date, 'start_time', lb.start_time, 'end_time', lb.end_time,
          'class_type', lb.class_type, 'status', lb.status, 'cancel_requested', lb.cancel_requested, 'notes', lb.notes,
          'created_at', lb.created_at, 'student_id', lb.student_id,
          'student_name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')))) ORDER BY lb.created_at)
        FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
        WHERE lb.branch_id = p_branch_id AND lb.lesson_date >= current_date - 7
          AND (lb.status = 'requested' OR lb.cancel_requested)), '[]'::jsonb)
  );
END $function$;