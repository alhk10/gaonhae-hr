CREATE OR REPLACE FUNCTION public.get_studio_rental_agreement_template()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT setting_value->>'text' FROM public.system_settings WHERE setting_key = 'studio_rental_agreement_template' ORDER BY updated_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_studio_rental_agreement_template() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_studio_rental_agreement_template(p_text text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF p_text IS NOT NULL AND length(p_text) > 50000 THEN RAISE EXCEPTION 'Agreement is too long'; END IF;
  v := CASE WHEN coalesce(btrim(p_text),'') = '' THEN jsonb_build_object('text', NULL, 'updated_by', left(coalesce(p_actor,'access'),100))
            ELSE jsonb_build_object('text', p_text, 'updated_by', left(coalesce(p_actor,'access'),100)) END;
  UPDATE public.system_settings SET setting_value = v, updated_at = now() WHERE setting_key = 'studio_rental_agreement_template';
  IF NOT FOUND THEN
    INSERT INTO public.system_settings(setting_key, setting_value) VALUES ('studio_rental_agreement_template', v);
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_save_studio_rental_agreement_template(text,text) TO anon, authenticated;