DO $$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='access_student_grading_records'
  LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, '_access_branch_check(', '_access_branch_check_read(');
    d := replace(d, '_access_scope(', '_access_scope_read(');
    EXECUTE d;
  END LOOP;
END $$;