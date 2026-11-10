ALTER TABLE public.access_unlock_passwords ADD COLUMN IF NOT EXISTS view_only boolean NOT NULL DEFAULT false;
INSERT INTO public.access_unlock_passwords(password_hash, branch_id, view_only)
SELECT encode(extensions.digest('Hp87783395','sha256'),'hex'), b.id, true FROM public.branches b
WHERE b.name ILIKE '%stradia%'
AND NOT EXISTS (SELECT 1 FROM public.access_unlock_passwords p WHERE p.password_hash=encode(extensions.digest('Hp87783395','sha256'),'hex') AND p.branch_id=b.id);

CREATE OR REPLACE FUNCTION public._access_scope_read(p_password text)
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
REVOKE ALL ON FUNCTION public._access_scope_read(text) FROM PUBLIC, anon, authenticated;

-- Default scope check refuses view-only passwords (secure by default for all write paths)
CREATE OR REPLACE FUNCTION public._access_scope(p_password text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM access_unlock_passwords WHERE view_only
      AND password_hash = encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex')) THEN
    RAISE EXCEPTION 'View-only access';
  END IF;
  RETURN public._access_scope_read(p_password);
END $$;
REVOKE ALL ON FUNCTION public._access_scope(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._access_branch_check_read(p_password text, p_branch_id text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_scope text := public._access_scope_read(p_password);
BEGIN
  IF p_branch_id IS NULL OR NOT public._scope_has(v_scope, p_branch_id) THEN RAISE EXCEPTION 'Not allowed for this branch'; END IF;
  RETURN v_scope;
END $$;
REVOKE ALL ON FUNCTION public._access_branch_check_read(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_unlock(p_password text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v text := public._access_scope_read(p_password); vo boolean;
BEGIN
  SELECT bool_or(view_only) INTO vo FROM access_unlock_passwords WHERE password_hash = encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex');
  IF v = '*' THEN RETURN jsonb_build_object('is_all', true, 'branch_ids', '[]'::jsonb, 'view_only', coalesce(vo,false)); END IF;
  RETURN jsonb_build_object('is_all', false, 'branch_ids', to_jsonb(string_to_array(v, ',')), 'view_only', coalesce(vo,false));
END $$;
GRANT EXECUTE ON FUNCTION public.access_unlock(text) TO anon, authenticated;

DO $$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('access_attendance_week','access_attendance_settings','access_attendance_students','access_progress_card_get','access_progress_card_list','access_progress_cards_for_students','access_progress_report','access_progress_settings','access_mute_unpaid_setting')
  LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, '_access_branch_check(', '_access_branch_check_read(');
    d := replace(d, '_access_scope(', '_access_scope_read(');
    IF r.proname = 'access_progress_settings' THEN
      d := replace(d, 'IF p_enabled IS NOT NULL THEN', 'IF p_enabled IS NOT NULL THEN PERFORM public._access_branch_check(p_password, p_branch_id);');
    ELSIF r.proname = 'access_mute_unpaid_setting' THEN
      d := replace(d, 'IF p_muted IS NOT NULL THEN', 'IF p_muted IS NOT NULL THEN PERFORM public._access_branch_check(p_password, p_branch_id);');
    END IF;
    EXECUTE d;
  END LOOP;
END $$;