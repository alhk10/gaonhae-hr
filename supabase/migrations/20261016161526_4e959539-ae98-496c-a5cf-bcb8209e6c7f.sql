CREATE OR REPLACE FUNCTION public.admin_set_guards_product_restrictions(p_product_id uuid, p_min_age integer, p_max_age integer, p_belts text[], p_actor text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_belts text[];
BEGIN
  IF (p_min_age IS NOT NULL AND (p_min_age < 0 OR p_min_age > 99))
     OR (p_max_age IS NOT NULL AND (p_max_age < 0 OR p_max_age > 99)) THEN
    RAISE EXCEPTION 'Age must be between 0 and 99';
  END IF;
  IF p_min_age IS NOT NULL AND p_max_age IS NOT NULL AND p_min_age > p_max_age THEN
    RAISE EXCEPTION 'Age from must not be greater than age to';
  END IF;
  v_belts := CASE WHEN p_belts IS NULL OR array_length(p_belts, 1) IS NULL THEN NULL ELSE p_belts END;
  IF v_belts IS NOT NULL AND NOT public.is_valid_belt_level_array(v_belts) THEN
    RAISE EXCEPTION 'Invalid belt level';
  END IF;
  UPDATE public.products SET min_age = p_min_age, max_age = p_max_age, allowed_belt_levels = v_belts, updated_at = now()
   WHERE id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_guards_product_restrictions(uuid, integer, integer, text[], text) TO anon, authenticated;