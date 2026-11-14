ALTER TABLE public.grading_registrations ADD COLUMN IF NOT EXISTS fee_override boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.access_grading_term_fee_status(p_password text, p_student_id uuid, p_term_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch text; c jsonb;
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check_read(p_password, v_branch);
  c := public._term_coverage(p_student_id, p_term_id);
  RETURN jsonb_build_object(
    'term_name', (SELECT name FROM term_calendars WHERE id = p_term_id),
    'paid_weeks', COALESCE((c->>'paid_weeks')::int, 0),
    'term_weeks', (c->>'term_weeks')::int,
    'grading_eligible', COALESCE((SELECT is_employee FROM students WHERE id = p_student_id), false) OR COALESCE((c->>'grading_eligible')::boolean, false));
END $$;
GRANT EXECUTE ON FUNCTION public.access_grading_term_fee_status(text, uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_set_ready_for_grading(p_password text, p_student_id uuid, p_term_id uuid, p_ready boolean, p_fee_override boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch text; v_belt text; v_state jsonb; v_ovr boolean := p_ready AND coalesce(p_fee_override,false);
BEGIN
  SELECT branch_id, current_belt INTO v_branch, v_belt FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF p_term_id IS NULL THEN RAISE EXCEPTION 'No term for this date'; END IF;
  v_state := public._grading_ready_state(p_student_id, p_term_id);
  IF NOT p_ready AND (v_state->>'paid')::boolean THEN RAISE EXCEPTION 'Grading already paid'; END IF;
  IF EXISTS (SELECT 1 FROM grading_registrations WHERE student_id = p_student_id AND term_id = p_term_id) THEN
    UPDATE grading_registrations SET ready_for_grading = p_ready, fee_override = v_ovr WHERE student_id = p_student_id AND term_id = p_term_id;
  ELSIF p_ready THEN
    INSERT INTO grading_registrations (student_id, term_id, branch_id, current_belt, target_belt, ready_for_grading, fee_override, created_by)
    VALUES (p_student_id, p_term_id, v_branch, coalesce(v_belt,'No belt'), coalesce(v_belt,'No belt'), true, v_ovr, 'access_attendance');
  END IF;
  RETURN public._grading_ready_state(p_student_id, p_term_id);
END $$;
DROP FUNCTION IF EXISTS public.access_set_ready_for_grading(text, uuid, uuid, boolean);
GRANT EXECUTE ON FUNCTION public.access_set_ready_for_grading(text, uuid, uuid, boolean, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hello_grading_eligibility(p_session_id uuid, p_student_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_branch text; v_term uuid; c jsonb; v_ovr boolean;
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  PERFORM public._validate_public_chat_session(p_session_id, p_student_id, v_branch);
  SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND current_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  IF v_term IS NULL THEN
    SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND t.start_date <= current_date ORDER BY t.start_date DESC LIMIT 1;
  END IF;
  c := public._term_coverage(p_student_id, v_term);
  v_ovr := EXISTS (SELECT 1 FROM grading_registrations WHERE student_id = p_student_id AND term_id = v_term AND ready_for_grading AND fee_override);
  RETURN public._grading_ready_state(p_student_id, v_term) || jsonb_build_object('term_id', v_term,
    'term_eligible', v_ovr OR COALESCE((SELECT is_employee FROM students WHERE id = p_student_id), false) OR COALESCE((c->>'grading_eligible')::boolean, false),
    'fee_override', v_ovr,
    'paid_weeks', COALESCE((c->>'paid_weeks')::int, 0), 'term_weeks', (c->>'term_weeks')::int);
END $function$;