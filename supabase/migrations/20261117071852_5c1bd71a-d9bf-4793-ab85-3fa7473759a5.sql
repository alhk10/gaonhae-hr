DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.admin_update_grading_scorecard(uuid,text,text)'::regprocedure) INTO d;
  d := replace(d, $x$IF NOT FOUND THEN RAISE EXCEPTION 'Grading record not found'; END IF;$x$, $x$IF r.id IS NULL THEN RAISE EXCEPTION 'Grading record not found'; END IF;$x$);
  EXECUTE d;
END $$;