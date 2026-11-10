ALTER TABLE public.student_progress_cards ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
UPDATE public.student_progress_cards SET grading_readiness='no' WHERE grading_readiness='nearly';

CREATE OR REPLACE FUNCTION public.access_progress_card_upsert(p_password text, p_student_id uuid, p_term_id uuid, p_row jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_branch text; v_id uuid; v_ready text := p_row->>'grading_readiness';
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF NOT EXISTS (SELECT 1 FROM term_calendars WHERE id = p_term_id) THEN RAISE EXCEPTION 'Term not found'; END IF;
  IF v_ready IS NOT NULL AND v_ready NOT IN ('yes','no') THEN RAISE EXCEPTION 'Invalid readiness'; END IF;
  INSERT INTO student_progress_cards(student_id, branch_id, term_calendar_id, term_label, report_date, belt_snapshot, age_snapshot, ratings, grading_readiness, comments)
  VALUES (p_student_id, v_branch, p_term_id, p_row->>'term_label', coalesce((p_row->>'report_date')::date, current_date),
    p_row->>'belt_snapshot', nullif(p_row->>'age_snapshot','')::int, coalesce(p_row->'ratings','{}'::jsonb), v_ready, NULL)
  ON CONFLICT (student_id, term_calendar_id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id, term_label = EXCLUDED.term_label, report_date = EXCLUDED.report_date,
    belt_snapshot = EXCLUDED.belt_snapshot, age_snapshot = EXCLUDED.age_snapshot, ratings = EXCLUDED.ratings,
    grading_readiness = EXCLUDED.grading_readiness, comments = NULL, viewed_at = NULL
  RETURNING id INTO v_id;
  IF v_ready = 'yes' THEN PERFORM public.access_set_ready_for_grading(p_password, p_student_id, p_term_id, true); END IF;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.hello_progress_cards(p_session_id uuid, p_student_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RAISE EXCEPTION 'Invalid chat session'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', c.id, 'term_id', c.term_calendar_id, 'term_label', c.term_label, 'report_date', c.report_date,
    'belt', c.belt_snapshot, 'age', c.age_snapshot, 'ratings', c.ratings, 'grading_readiness', c.grading_readiness,
    'viewed_at', c.viewed_at, 'dob', s.date_of_birth,
    'name', upper(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))))
    ORDER BY c.report_date DESC)
    FROM student_progress_cards c JOIN students s ON s.id = c.student_id WHERE c.student_id = p_student_id), '[]'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.hello_mark_progress_card_viewed(p_session_id uuid, p_student_id uuid, p_card_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RAISE EXCEPTION 'Invalid chat session'; END IF;
  UPDATE student_progress_cards SET viewed_at = now() WHERE id = p_card_id AND student_id = p_student_id AND viewed_at IS NULL;
END $function$;

GRANT EXECUTE ON FUNCTION public.hello_progress_cards(uuid,uuid), public.hello_mark_progress_card_viewed(uuid,uuid,uuid) TO anon, authenticated;