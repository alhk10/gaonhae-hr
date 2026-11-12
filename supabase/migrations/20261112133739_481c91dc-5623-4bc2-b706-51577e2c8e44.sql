
CREATE OR REPLACE FUNCTION public._settings_guard(p_password text, p_branch_id text, p_require_all boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text;
BEGIN
  IF public.sms_is_superadmin() THEN RETURN; END IF;
  v_scope := public._access_scope(p_password);
  IF v_scope IS NULL OR v_scope = '' THEN RAISE EXCEPTION 'A valid /access password is required'; END IF;
  IF v_scope = '*' THEN RETURN; END IF;
  IF p_require_all THEN RAISE EXCEPTION 'Only the all-branch password can change this setting'; END IF;
  IF p_branch_id IS NULL OR NOT public._scope_has(v_scope, p_branch_id) THEN
    RAISE EXCEPTION 'This password can''t change another branch''s settings';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._settings_guard(text,text,boolean) FROM PUBLIC, anon, authenticated;

-- Move originals to private implementations
ALTER FUNCTION public.admin_set_guards_product_branch_setting(text,text,uuid,boolean,numeric,text) RENAME TO _impl_set_guards_product_branch_setting;
ALTER FUNCTION public.admin_set_class_product_branch_pricing(text,uuid,boolean,numeric,text) RENAME TO _impl_set_class_product_branch_pricing;
ALTER FUNCTION public.admin_set_guards_product_restrictions(uuid,integer,integer,text[],text) RENAME TO _impl_set_guards_product_restrictions;
ALTER FUNCTION public.admin_save_studio_rental_agreement_template(text,text) RENAME TO _impl_save_studio_rental_agreement_template;
ALTER FUNCTION public.admin_upsert_studio_rental_settings(text,boolean,numeric,numeric,numeric,numeric) RENAME TO _impl_upsert_studio_rental_settings;
ALTER FUNCTION public.admin_upsert_grading_slot(uuid,text,date,time,time,text,text,text[],uuid[],integer,integer,text[]) RENAME TO _impl_upsert_grading_slot;
ALTER FUNCTION public.admin_set_grading_slot_meta(uuid,boolean,text,integer,integer) RENAME TO _impl_set_grading_slot_meta;
ALTER FUNCTION public.admin_delete_grading_slot(uuid) RENAME TO _impl_delete_grading_slot;
ALTER FUNCTION public.get_guards_products_for_branch_admin(text) RENAME TO _impl_guards_products_for_branch_admin;
REVOKE ALL ON FUNCTION public._impl_set_guards_product_branch_setting(text,text,uuid,boolean,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_set_class_product_branch_pricing(text,uuid,boolean,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_set_guards_product_restrictions(uuid,integer,integer,text[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_save_studio_rental_agreement_template(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_upsert_studio_rental_settings(text,boolean,numeric,numeric,numeric,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_upsert_grading_slot(uuid,text,date,time,time,text,text,text[],uuid[],integer,integer,text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_set_grading_slot_meta(uuid,boolean,text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_delete_grading_slot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_guards_products_for_branch_admin(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_set_guards_product_branch_setting(p_branch_id text, p_item_key text, p_product_id uuid, p_available boolean, p_price_override numeric, p_actor text DEFAULT NULL, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, p_branch_id);
  PERFORM public._impl_set_guards_product_branch_setting(p_branch_id, p_item_key, p_product_id, p_available, p_price_override, p_actor); END $$;

CREATE FUNCTION public.admin_set_class_product_branch_pricing(p_branch_id text, p_product_id uuid, p_available boolean, p_price_override numeric, p_actor text DEFAULT NULL, p_password text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, p_branch_id);
  RETURN public._impl_set_class_product_branch_pricing(p_branch_id, p_product_id, p_available, p_price_override, p_actor); END $$;

CREATE FUNCTION public.admin_set_guards_product_restrictions(p_product_id uuid, p_min_age integer, p_max_age integer, p_belts text[], p_actor text DEFAULT NULL, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, NULL, true);
  PERFORM public._impl_set_guards_product_restrictions(p_product_id, p_min_age, p_max_age, p_belts, p_actor); END $$;

CREATE FUNCTION public.admin_save_studio_rental_agreement_template(p_text text, p_actor text, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, NULL, true);
  PERFORM public._impl_save_studio_rental_agreement_template(p_text, p_actor); END $$;

CREATE FUNCTION public.admin_upsert_studio_rental_settings(p_branch_id text, p_enabled boolean, p_hourly numeric, p_discounted numeric, p_threshold numeric, p_deposit numeric, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, p_branch_id);
  PERFORM public._impl_upsert_studio_rental_settings(p_branch_id, p_enabled, p_hourly, p_discounted, p_threshold, p_deposit); END $$;

CREATE FUNCTION public.admin_upsert_grading_slot(p_id uuid, p_branch_id text, p_grading_date date, p_start_time time, p_end_time time, p_title text, p_location text, p_belt_levels text[], p_grading_product_ids uuid[], p_min_age integer, p_max_age integer, p_available_branch_ids text[], p_password text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_old_shared text[];
BEGIN
  IF p_id IS NOT NULL THEN
    SELECT branch_id, available_branch_ids INTO v_old, v_old_shared FROM grading_slots WHERE id = p_id;
    IF v_old IS NOT NULL THEN PERFORM public._settings_guard(p_password, v_old); END IF;
  END IF;
  PERFORM public._settings_guard(p_password, p_branch_id,
    EXISTS (SELECT 1 FROM unnest(COALESCE(p_available_branch_ids,'{}') || COALESCE(v_old_shared,'{}')) b WHERE b IS DISTINCT FROM p_branch_id AND b IS DISTINCT FROM v_old));
  RETURN public._impl_upsert_grading_slot(p_id, p_branch_id, p_grading_date, p_start_time, p_end_time, p_title, p_location, p_belt_levels, p_grading_product_ids, p_min_age, p_max_age, p_available_branch_ids);
END $$;

CREATE FUNCTION public.admin_set_grading_slot_meta(p_id uuid, p_is_hidden boolean, p_slot_kind text, p_year integer, p_term integer, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b text; v_sh text[];
BEGIN SELECT branch_id, available_branch_ids INTO v_b, v_sh FROM grading_slots WHERE id = p_id;
  PERFORM public._settings_guard(p_password, v_b, EXISTS (SELECT 1 FROM unnest(COALESCE(v_sh,'{}')) b WHERE b IS DISTINCT FROM v_b));
  PERFORM public._impl_set_grading_slot_meta(p_id, p_is_hidden, p_slot_kind, p_year, p_term); END $$;

CREATE FUNCTION public.admin_delete_grading_slot(p_id uuid, p_password text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b text; v_sh text[];
BEGIN SELECT branch_id, available_branch_ids INTO v_b, v_sh FROM grading_slots WHERE id = p_id;
  PERFORM public._settings_guard(p_password, v_b, EXISTS (SELECT 1 FROM unnest(COALESCE(v_sh,'{}')) b WHERE b IS DISTINCT FROM v_b));
  PERFORM public._impl_delete_grading_slot(p_id); END $$;

CREATE FUNCTION public.get_guards_products_for_branch_admin(p_branch_id text, p_password text DEFAULT NULL)
RETURNS TABLE(item_key text, product_id uuid, item_type text, name text, description text, default_price numeric, is_available boolean, price_override numeric, min_age integer, max_age integer, allowed_belt_levels text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._settings_guard(p_password, p_branch_id);
  RETURN QUERY SELECT * FROM public._impl_guards_products_for_branch_admin(p_branch_id); END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_guards_product_branch_setting(text,text,uuid,boolean,numeric,text,text),
  public.admin_set_class_product_branch_pricing(text,uuid,boolean,numeric,text,text),
  public.admin_set_guards_product_restrictions(uuid,integer,integer,text[],text,text),
  public.admin_save_studio_rental_agreement_template(text,text,text),
  public.admin_upsert_studio_rental_settings(text,boolean,numeric,numeric,numeric,numeric,text),
  public.admin_upsert_grading_slot(uuid,text,date,time,time,text,text,text[],uuid[],integer,integer,text[],text),
  public.admin_set_grading_slot_meta(uuid,boolean,text,integer,integer,text),
  public.admin_delete_grading_slot(uuid,text),
  public.get_guards_products_for_branch_admin(text,text) TO anon, authenticated;
