ALTER TABLE public.progress_card_settings ADD COLUMN IF NOT EXISTS calendar_as_term boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.access_calendar_term_setting(p_password text, p_branch_id text, p_on boolean DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  PERFORM public._access_branch_check_read(p_password, p_branch_id);
  IF p_on IS NOT NULL THEN
    PERFORM public._access_branch_check(p_password, p_branch_id);
    INSERT INTO progress_card_settings(branch_id, calendar_as_term, updated_at) VALUES (p_branch_id, p_on, now())
    ON CONFLICT (branch_id) DO UPDATE SET calendar_as_term = EXCLUDED.calendar_as_term, updated_at = now();
  END IF;
  SELECT calendar_as_term INTO v FROM progress_card_settings WHERE branch_id = p_branch_id;
  RETURN coalesce(v, false);
END $$;
GRANT EXECUTE ON FUNCTION public.access_calendar_term_setting(text,text,boolean) TO anon, authenticated;
INSERT INTO public.progress_card_settings(branch_id, calendar_as_term)
SELECT id::text, true FROM public.branches WHERE name ILIKE '%stradia%'
ON CONFLICT (branch_id) DO UPDATE SET calendar_as_term = true;