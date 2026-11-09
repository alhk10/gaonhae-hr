DO $do$
DECLARE r record; v_def text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('access_record_payment','record_external_invoice_payment') LOOP
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def,
      $$IF p_method IN ('paynow','bank_transfer') AND nullif(trim(p_proof_url),'') IS NULL THEN$$,
      $$IF v_scope <> '*' AND p_method IN ('paynow','bank_transfer') AND nullif(trim(p_proof_url),'') IS NULL THEN$$);
    IF position($$v_scope <> '*' AND p_method IN$$ in v_def) = 0 THEN RAISE EXCEPTION 'proof check not found in %', r.oid::regproc; END IF;
    EXECUTE v_def;
  END LOOP;
END $do$;