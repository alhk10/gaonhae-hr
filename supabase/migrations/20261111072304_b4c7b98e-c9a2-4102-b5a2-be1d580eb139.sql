CREATE TABLE public.access_unlock_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  scope text,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.access_unlock_log TO service_role;
ALTER TABLE public.access_unlock_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.access_unlock_log (password_hash, unlocked_at DESC);

CREATE OR REPLACE FUNCTION public.access_unlock(p_password text)
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v text := public._access_scope_read(p_password); vo boolean;
  h text := encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex');
BEGIN
  SELECT bool_or(view_only) INTO vo FROM access_unlock_passwords WHERE password_hash = h;
  INSERT INTO access_unlock_log(password_hash, scope) VALUES (h, v);
  IF v = '*' THEN RETURN jsonb_build_object('is_all', true, 'branch_ids', '[]'::jsonb, 'view_only', coalesce(vo,false)); END IF;
  RETURN jsonb_build_object('is_all', false, 'branch_ids', to_jsonb(string_to_array(v, ',')), 'view_only', coalesce(vo,false));
END $function$;

CREATE OR REPLACE FUNCTION public.access_password_last_used(p_password text)
 RETURNS TABLE(password_key text, unlocked_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN QUERY SELECT l.password_hash, l.unlocked_at FROM access_unlock_log l
    WHERE l.password_hash IN (SELECT password_hash FROM access_unlock_passwords)
    ORDER BY l.unlocked_at DESC LIMIT 500;
END $function$;
GRANT EXECUTE ON FUNCTION public.access_password_last_used(text) TO anon, authenticated;