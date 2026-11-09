DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef('public.access_branch_journal'::regproc) INTO v_def;
  v_def := replace(v_def, 's.full_name', $r$nullif(upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))),'')$r$);
  EXECUTE v_def;
END $$;