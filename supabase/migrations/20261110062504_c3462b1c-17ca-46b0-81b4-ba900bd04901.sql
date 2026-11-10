ALTER TABLE public.progress_card_settings ADD COLUMN IF NOT EXISTS mute_unpaid_warnings boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.access_mute_unpaid_setting(p_password text, p_branch_id text, p_muted boolean DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  IF p_muted IS NOT NULL THEN
    INSERT INTO progress_card_settings(branch_id, mute_unpaid_warnings, updated_at) VALUES (p_branch_id, p_muted, now())
    ON CONFLICT (branch_id) DO UPDATE SET mute_unpaid_warnings = EXCLUDED.mute_unpaid_warnings, updated_at = now();
  END IF;
  SELECT mute_unpaid_warnings INTO v FROM progress_card_settings WHERE branch_id = p_branch_id;
  RETURN coalesce(v, false);
END $$;
GRANT EXECUTE ON FUNCTION public.access_mute_unpaid_setting(text,text,boolean) TO anon, authenticated;
INSERT INTO public.progress_card_settings(branch_id, mute_unpaid_warnings)
SELECT id::text, true FROM public.branches WHERE name ILIKE '%stradia%'
ON CONFLICT (branch_id) DO UPDATE SET mute_unpaid_warnings = true;