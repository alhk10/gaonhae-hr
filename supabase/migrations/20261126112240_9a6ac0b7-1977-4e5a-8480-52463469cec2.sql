CREATE OR REPLACE FUNCTION public.access_branch_term_fees_external_set(p_password text, p_branch_id text, p_value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._settings_guard(p_password, p_branch_id, true);
  UPDATE public.branches SET term_fees_external = COALESCE(p_value,false) WHERE id = p_branch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.access_branch_term_fees_external_set(text,text,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.access_branch_term_fees_external_set(text,text,boolean) TO anon, authenticated;