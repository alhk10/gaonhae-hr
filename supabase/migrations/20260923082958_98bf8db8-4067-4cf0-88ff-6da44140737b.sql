DO $do$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN ('submit_public_chat_invoice', 'admin_match_school_fees_submission')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    IF position('''pending_verification''' in v_def) > 0 THEN
      v_def := replace(v_def, 'false, ''pending_verification''', 'false, ''pending''');
      v_def := replace(v_def, E'      false,\n      ''pending_verification'',', E'      false,\n      ''pending'',');
      EXECUTE v_def;
    END IF;
  END LOOP;
END
$do$;