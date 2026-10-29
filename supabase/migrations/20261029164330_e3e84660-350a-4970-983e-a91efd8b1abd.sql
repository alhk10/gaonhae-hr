CREATE OR REPLACE FUNCTION public.access_unlock(p_password text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v text := public._access_scope(p_password);
BEGIN
  IF v = '*' THEN RETURN jsonb_build_object('is_all', true, 'branch_ids', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('is_all', false, 'branch_ids', to_jsonb(string_to_array(v, ',')));
END $$;
GRANT EXECUTE ON FUNCTION public.access_unlock(text) TO anon, authenticated;