CREATE OR REPLACE FUNCTION public._cert_can_view(p_password text, p_student_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_branch text;
BEGIN
  SELECT branch_id::text INTO v_branch FROM students WHERE id = p_student_id;
  IF public.is_superadmin(auth.jwt()->>'email') THEN RETURN true; END IF;
  IF p_password IS NULL THEN RETURN false; END IF;
  RETURN _scope_has(_access_scope_read(p_password), v_branch);
END $$;
REVOKE ALL ON FUNCTION public._cert_can_view(text,uuid) FROM PUBLIC, anon, authenticated;
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE proname='access_student_grading_records';
  EXECUTE replace(d, '_cert_can_manage(', '_cert_can_view(');
END $$;