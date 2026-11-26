ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS term_fees_external boolean NOT NULL DEFAULT false;
UPDATE public.branches SET term_fees_external = true WHERE id IN ('BR1769014316844','BR1769014228743');

CREATE OR REPLACE FUNCTION public._branch_fees_external(p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT b.term_fees_external FROM students s JOIN branches b ON b.id = s.branch_id WHERE s.id = p_student_id), false)
$$;
REVOKE ALL ON FUNCTION public._branch_fees_external(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hello_grading_eligibility(p_session_id uuid, p_student_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    'term_eligible', v_ovr OR public._branch_fees_external(p_student_id) OR COALESCE((SELECT is_employee FROM students WHERE id = p_student_id), false) OR COALESCE((c->>'grading_eligible')::boolean, false),
    'fee_override', v_ovr,
    'paid_weeks', COALESCE((c->>'paid_weeks')::int, 0), 'term_weeks', (c->>'term_weeks')::int);
END $function$;

CREATE OR REPLACE FUNCTION public.access_grading_term_fee_status(p_password text, p_student_id uuid, p_term_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    'grading_eligible', public._branch_fees_external(p_student_id) OR COALESCE((SELECT is_employee FROM students WHERE id = p_student_id), false) OR COALESCE((c->>'grading_eligible')::boolean, false));
END $function$;