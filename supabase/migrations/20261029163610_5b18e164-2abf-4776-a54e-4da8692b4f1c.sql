ALTER TABLE public.access_unlock_passwords ADD COLUMN IF NOT EXISTS label text;

INSERT INTO public.access_unlock_passwords(password_hash, branch_id, label)
SELECT encode(extensions.digest('Hp89891504','sha256'),'hex'), 'BR1769014316844', '…504'
WHERE NOT EXISTS (SELECT 1 FROM public.access_unlock_passwords WHERE password_hash=encode(extensions.digest('Hp89891504','sha256'),'hex'));

CREATE OR REPLACE FUNCTION public._access_require_all(p_password text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF public._access_scope(p_password) <> '*' THEN RAISE EXCEPTION 'All-branch password required'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.access_password_list(p_password text)
RETURNS TABLE(password_key text, label text, is_all boolean, branch_ids text[], is_self boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN QUERY
  SELECT a.password_hash, max(a.label), bool_or(a.branch_id IS NULL),
         array_remove(array_agg(a.branch_id ORDER BY a.branch_id), NULL),
         a.password_hash = encode(extensions.digest(p_password,'sha256'),'hex')
    FROM access_unlock_passwords a GROUP BY a.password_hash ORDER BY bool_or(a.branch_id IS NULL) DESC, max(a.label);
END $$;

CREATE OR REPLACE FUNCTION public.access_password_save(p_password text, p_key text, p_new_password text, p_all boolean, p_branch_ids text[], p_label text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_self text := encode(extensions.digest(p_password,'sha256'),'hex'); v_hash text; v_label text;
BEGIN
  PERFORM public._access_require_all(p_password);
  IF p_key = v_self THEN RAISE EXCEPTION 'The current all-branch password cannot be changed here'; END IF;
  IF NOT coalesce(p_all,false) AND coalesce(array_length(p_branch_ids,1),0)=0 THEN RAISE EXCEPTION 'Choose at least one branch'; END IF;
  IF p_new_password IS NOT NULL AND length(trim(p_new_password))>0 THEN
    IF length(trim(p_new_password)) < 6 THEN RAISE EXCEPTION 'Password must be at least 6 characters'; END IF;
    v_hash := encode(extensions.digest(trim(p_new_password),'sha256'),'hex');
    IF v_hash IS DISTINCT FROM p_key AND EXISTS(SELECT 1 FROM access_unlock_passwords WHERE password_hash=v_hash) THEN
      RAISE EXCEPTION 'That password is already in use'; END IF;
    v_label := coalesce(nullif(trim(p_label),''), '…'||right(trim(p_new_password),3));
  ELSE
    IF p_key IS NULL THEN RAISE EXCEPTION 'Password required'; END IF;
    v_hash := p_key;
    SELECT coalesce(nullif(trim(p_label),''), max(label)) INTO v_label FROM access_unlock_passwords WHERE password_hash=p_key;
  END IF;
  IF p_key IS NOT NULL THEN DELETE FROM access_unlock_passwords WHERE password_hash=p_key; END IF;
  IF p_all THEN
    INSERT INTO access_unlock_passwords(password_hash,branch_id,label) VALUES (v_hash,NULL,v_label);
  ELSE
    INSERT INTO access_unlock_passwords(password_hash,branch_id,label)
    SELECT DISTINCT v_hash, b, v_label FROM unnest(p_branch_ids) b;
  END IF;
  RETURN v_hash;
END $$;

CREATE OR REPLACE FUNCTION public.access_password_delete(p_password text, p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  IF p_key = encode(extensions.digest(p_password,'sha256'),'hex') THEN RAISE EXCEPTION 'Cannot delete the password you are using'; END IF;
  DELETE FROM access_unlock_passwords WHERE password_hash=p_key;
END $$;

GRANT EXECUTE ON FUNCTION public.access_password_list(text), public.access_password_save(text,text,text,boolean,text[],text), public.access_password_delete(text,text) TO anon, authenticated;