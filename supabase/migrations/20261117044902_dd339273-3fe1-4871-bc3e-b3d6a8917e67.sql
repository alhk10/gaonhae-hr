REVOKE EXECUTE ON FUNCTION public._entitlement_branch_scopes() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._invoice_home_branch() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._student_at_branch(uuid, text) FROM public, anon, authenticated;
DO $$
DECLARE d text := pg_get_functiondef('public.get_public_student_directory(text,text,text)'::regprocedure);
BEGIN
  d := replace(d, 'WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)',
    'WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id OR EXISTS (SELECT 1 FROM student_branches sb WHERE sb.student_id = s.id AND sb.branch_id = p_branch_id))');
  IF position('student_branches' in d) = 0 THEN RAISE EXCEPTION 'directory filter not patched'; END IF;
  EXECUTE d;
END $$;