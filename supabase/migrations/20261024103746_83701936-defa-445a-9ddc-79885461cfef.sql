ALTER TABLE public.access_unlock_passwords DROP CONSTRAINT IF EXISTS access_unlock_passwords_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS access_unlock_passwords_hash_branch_uq ON public.access_unlock_passwords (password_hash, coalesce(branch_id,''));
INSERT INTO public.access_unlock_passwords(password_hash, branch_id)
SELECT encode(extensions.digest('Hp89234866','sha256'),'hex'), 'BR1769014316844'
WHERE NOT EXISTS (SELECT 1 FROM public.access_unlock_passwords WHERE password_hash=encode(extensions.digest('Hp89234866','sha256'),'hex') AND branch_id='BR1769014316844');

-- Returns '*' for all-branch, otherwise comma-separated branch ids
CREATE OR REPLACE FUNCTION public._access_scope(p_password text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_all boolean; v_list text; v_found boolean;
BEGIN
  SELECT count(*)>0, bool_or(branch_id IS NULL), string_agg(branch_id, ',' ORDER BY branch_id)
    INTO v_found, v_all, v_list FROM access_unlock_passwords
   WHERE password_hash = encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex');
  IF NOT coalesce(v_found,false) THEN RAISE EXCEPTION 'Staff password required'; END IF;
  IF v_all THEN RETURN '*'; END IF;
  RETURN v_list;
END $$;
REVOKE ALL ON FUNCTION public._access_scope(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._scope_has(p_scope text, p_branch text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT p_scope='*' OR (p_branch IS NOT NULL AND p_branch = ANY(string_to_array(p_scope, ',')))
$$;
REVOKE ALL ON FUNCTION public._scope_has(text,text) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('list_external_invoices','record_external_invoice_payment','cancel_external_invoice','list_external_invoice_products','create_external_invoice')
  LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, 'i.branch_id=v_scope', '_scope_has(v_scope, i.branch_id)');
    d := replace(d, 'v_inv.branch_id <> v_scope', 'NOT _scope_has(v_scope, v_inv.branch_id)');
    d := replace(d, 'p_branch_id IS DISTINCT FROM v_scope', 'NOT _scope_has(v_scope, p_branch_id)');
    d := replace(d, 'v_branch <> v_scope', 'NOT _scope_has(v_scope, v_branch)');
    EXECUTE d;
  END LOOP;
END $$;