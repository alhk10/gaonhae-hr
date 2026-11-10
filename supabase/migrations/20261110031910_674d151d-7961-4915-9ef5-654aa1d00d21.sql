CREATE OR REPLACE FUNCTION public.access_progress_cards_for_students(p_password text, p_student_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_scope text := public._access_scope(p_password);
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Invalid password'; END IF;
  RETURN jsonb_build_object(
    'enabled_branches', coalesce((SELECT jsonb_agg(branch_id) FROM progress_card_settings WHERE enabled AND public._scope_has(v_scope, branch_id)), '[]'::jsonb),
    'cards', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'student_id', c.student_id, 'term_id', c.term_calendar_id, 'term_label', c.term_label, 'report_date', c.report_date,
      'belt', c.belt_snapshot, 'age', c.age_snapshot, 'ratings', c.ratings, 'grading_readiness', c.grading_readiness,
      'dob', s.date_of_birth, 'name', upper(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))))
      ORDER BY c.report_date DESC)
      FROM student_progress_cards c JOIN students s ON s.id = c.student_id
      WHERE c.student_id = ANY(p_student_ids) AND public._scope_has(v_scope, s.branch_id)), '[]'::jsonb));
END $function$;
GRANT EXECUTE ON FUNCTION public.access_progress_cards_for_students(text, uuid[]) TO anon, authenticated;