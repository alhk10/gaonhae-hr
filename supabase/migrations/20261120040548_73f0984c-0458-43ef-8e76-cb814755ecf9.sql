DO $$
DECLARE d text := pg_get_functiondef('public.create_external_invoice(text,jsonb)'::regprocedure);
BEGIN
  d := replace(d, 'v_custom uuid;', 'v_custom uuid; v_pid uuid;');
  d := replace(d, 'v_prod := NULL;', 'v_pid := NULL;');
  d := replace(d, 'IF NOT FOUND THEN RAISE EXCEPTION ''Product not found''; END IF;', 'IF NOT FOUND THEN RAISE EXCEPTION ''Product not found''; END IF; v_pid := v_prod.id;');
  d := replace(d, 'coalesce(v_prod.id, v_custom), CASE WHEN v_prod.id IS NULL', 'coalesce(v_pid, v_custom), CASE WHEN v_pid IS NULL');
  IF position('v_prod.id IS NULL' in d) > 0 OR position('v_pid := v_prod.id' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE d;
END $$;