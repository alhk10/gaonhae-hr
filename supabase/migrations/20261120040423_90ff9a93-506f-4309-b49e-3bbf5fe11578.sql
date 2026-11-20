DO $$
DECLARE d text := pg_get_functiondef('public.create_external_invoice(text,jsonb)'::regprocedure);
BEGIN
  d := replace(d, 'subtotal=round(CASE WHEN v_incl THEN v_total - v_tax ELSE v_gross_sum - v_disc_sum END,2)', 'subtotal=round(v_total - v_tax + v_disc_sum,2)');
  IF position('v_total - v_tax + v_disc_sum' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE d;
END $$;