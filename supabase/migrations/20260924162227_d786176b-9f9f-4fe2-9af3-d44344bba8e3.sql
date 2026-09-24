DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.get_public_invoice_full','public.get_public_school_fees_invoice'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.oid = (SELECT oid FROM pg_proc WHERE oid::regprocedure::text LIKE replace(f,'public.','') || '(%' AND pronamespace='public'::regnamespace LIMIT 1);
    d := replace(d, 'st.name', 'COALESCE(NULLIF(trim(concat_ws('' '', st.first_name, st.last_name)), ''''), st.display_name)');
    EXECUTE d;
  END LOOP;
END $$;