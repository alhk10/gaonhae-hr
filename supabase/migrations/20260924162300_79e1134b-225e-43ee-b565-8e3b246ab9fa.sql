DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['get_public_invoice_full','get_public_school_fees_invoice'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.proname=f AND p.pronamespace='public'::regnamespace LIMIT 1;
    d := replace(d, 'it.total_price', 'it.total_amount');
    EXECUTE d;
  END LOOP;
END $$;