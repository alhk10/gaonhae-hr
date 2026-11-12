ALTER FUNCTION public.admin_set_class_product_age_range(uuid,integer,integer,text) RENAME TO _impl_set_class_product_age_range;
REVOKE ALL ON FUNCTION public._impl_set_class_product_age_range(uuid,integer,integer,text) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_set_class_product_age_range(p_product_id uuid, p_min_age integer, p_max_age integer, p_actor text DEFAULT NULL, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, NULL, true);
  PERFORM public._impl_set_class_product_age_range(p_product_id, p_min_age, p_max_age, p_actor); END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_class_product_age_range(uuid,integer,integer,text,text) TO anon, authenticated;