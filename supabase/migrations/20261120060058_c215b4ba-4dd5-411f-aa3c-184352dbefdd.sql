DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public._bank_apply_external(uuid,uuid,text)','public._bank_apply_match(uuid,uuid[],text)'] LOOP
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, 'INSERT INTO public.security_audit_log(action, details) VALUES (''bank_txn_matched'',', 'INSERT INTO public.security_audit_log(user_email, action, details) VALUES (p_by, ''bank_txn_matched'',');
    d := replace(d, 'INSERT INTO security_audit_log(action, details) VALUES (''bank_txn_matched'',', 'INSERT INTO security_audit_log(user_email, action, details) VALUES (p_by, ''bank_txn_matched'',');
    IF position('user_email' in d) = 0 THEN RAISE EXCEPTION 'patch failed %', f; END IF;
    EXECUTE d;
  END LOOP;
END $$;