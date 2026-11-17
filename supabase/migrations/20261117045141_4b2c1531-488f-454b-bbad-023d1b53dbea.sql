DO $$
DECLARE d text := pg_get_functiondef('public.get_public_branch_timetable_slots(uuid,uuid)'::regprocedure);
BEGIN
  d := replace(d, 'WHERE t.branch_id = v_student.branch_id AND t.is_active = true',
    'WHERE public._student_at_branch(p_student_id, t.branch_id) AND t.is_active = true');
  IF position('_student_at_branch' in d) = 0 THEN RAISE EXCEPTION 'not patched'; END IF;
  EXECUTE d;
END $$;