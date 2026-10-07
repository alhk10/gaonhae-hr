DROP FUNCTION public.get_class_products_for_branch_admin(text);
CREATE FUNCTION public.get_class_products_for_branch_admin(p_branch_id text)
 RETURNS TABLE(product_id uuid, product_name text, description text, base_price numeric, rule_id uuid, price_override numeric, is_available boolean, min_age integer, max_age integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (p.id)
      p.id, p.name, p.description, p.base_price, pr.id, pr.price_override,
      COALESCE(pr.is_active, false), p.min_age::int, p.max_age::int
    FROM public.products p
    LEFT JOIN public.price_rules pr ON pr.product_id = p.id AND pr.branch_id = p_branch_id
    WHERE p.is_active = true
      AND p.category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid
      AND p.name NOT IN ('Trial Lesson', 'Private Lesson')
    ORDER BY p.id, pr.is_active DESC NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION public.get_class_products_for_branch_admin(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_class_product_age_range(p_product_id uuid, p_min_age integer, p_max_age integer, p_actor text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF (p_min_age IS NOT NULL AND (p_min_age < 0 OR p_min_age > 99))
     OR (p_max_age IS NOT NULL AND (p_max_age < 0 OR p_max_age > 99)) THEN
    RAISE EXCEPTION 'Age must be between 0 and 99';
  END IF;
  IF p_min_age IS NOT NULL AND p_max_age IS NOT NULL AND p_min_age > p_max_age THEN
    RAISE EXCEPTION 'Age from must not be greater than age to';
  END IF;
  UPDATE public.products SET min_age = p_min_age, max_age = p_max_age, updated_at = now()
   WHERE id = p_product_id
     AND category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid
     AND name NOT IN ('Trial Lesson', 'Private Lesson');
  IF NOT FOUND THEN RAISE EXCEPTION 'Class product not found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_class_product_age_range(uuid, integer, integer, text) TO anon, authenticated;