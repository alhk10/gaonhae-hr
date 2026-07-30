CREATE OR REPLACE FUNCTION public.get_class_products_for_branch_admin(p_branch_id text)
RETURNS TABLE(product_id uuid, product_name text, description text, base_price numeric, rule_id uuid, price_override numeric, is_available boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT DISTINCT ON (p.id)
      p.id AS product_id,
      p.name AS product_name,
      p.description,
      p.base_price,
      pr.id AS rule_id,
      pr.price_override,
      COALESCE(pr.is_active, false) AS is_available
    FROM public.products p
    LEFT JOIN public.price_rules pr
      ON pr.product_id = p.id
     AND pr.branch_id = p_branch_id
    WHERE p.is_active = true
      AND p.category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid
      AND p.name NOT IN ('Trial Lesson', 'Ad-Hoc Lesson', 'Private Lesson')
    ORDER BY p.id, pr.is_active DESC NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x
  ORDER BY x.product_name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_class_products_for_branch_admin(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_class_product_branch_pricing(
  p_branch_id text,
  p_product_id uuid,
  p_available boolean,
  p_price_override numeric,
  p_actor text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule_id uuid;
BEGIN
  SELECT id INTO v_rule_id
  FROM public.price_rules
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id
  ORDER BY is_active DESC NULLS LAST, updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_rule_id IS NULL THEN
    INSERT INTO public.price_rules (product_id, rule_name, branch_id, price_override, is_active, created_by, updated_by)
    VALUES (p_product_id, p_branch_id || ' class pricing', p_branch_id, p_price_override, COALESCE(p_available, false), p_actor, p_actor)
    RETURNING id INTO v_rule_id;
  ELSE
    UPDATE public.price_rules
    SET price_override = p_price_override,
        is_active = COALESCE(p_available, false),
        updated_by = p_actor,
        updated_at = now()
    WHERE id = v_rule_id;
  END IF;

  RETURN v_rule_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_class_product_branch_pricing(text, uuid, boolean, numeric, text) TO anon, authenticated;