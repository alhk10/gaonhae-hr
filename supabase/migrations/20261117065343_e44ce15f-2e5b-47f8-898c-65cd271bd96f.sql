DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.admin_update_grading_scorecard(uuid,text,text)'::regprocedure) INTO d;
  d := replace(d, $x$IF lower(coalesce(r.branch_name,'')) <> 'morley' THEN RAISE EXCEPTION 'Score entry is only enabled for Morley'; END IF;$x$, '');
  EXECUTE d;
END $$;