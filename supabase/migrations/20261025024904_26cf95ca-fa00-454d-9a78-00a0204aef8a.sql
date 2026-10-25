ALTER TABLE public.lesson_class_types ADD COLUMN IF NOT EXISTS color text;
CREATE OR REPLACE FUNCTION public.access_class_type_set_color(p_password text, p_branch_id text, p_id uuid, p_color text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  IF p_color IS NOT NULL AND p_color !~ '^[a-z]{3,12}$' THEN RAISE EXCEPTION 'Invalid colour'; END IF;
  UPDATE lesson_class_types SET color = p_color WHERE id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.access_class_type_set_color(text, text, uuid, text) TO anon, authenticated;