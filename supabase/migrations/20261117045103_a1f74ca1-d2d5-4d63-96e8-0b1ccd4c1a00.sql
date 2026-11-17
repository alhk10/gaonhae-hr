DO $$
DECLARE d text := pg_get_functiondef('public.hello_submit_lesson_request(uuid,uuid,jsonb,jsonb,text)'::regprocedure);
BEGIN
  d := replace(d, 'AND bt.branch_id = v_branch AND bt.is_active;',
    'AND public._student_at_branch(p_student_id, bt.branch_id) AND bt.is_active;
    IF v_tt.id IS NOT NULL THEN v_branch := v_tt.branch_id; END IF;');
  IF position('_student_at_branch' in d) = 0 THEN RAISE EXCEPTION 'not patched'; END IF;
  EXECUTE d;
END $$;