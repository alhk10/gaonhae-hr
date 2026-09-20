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
      AND p.name NOT IN ('Trial Lesson', 'Private Lesson')
    ORDER BY p.id, pr.is_active DESC NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x
  ORDER BY x.product_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_class_products(p_branch_id text)
 RETURNS TABLE(product_id uuid, product_name text, description text, base_price numeric, branch_price numeric)
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
      COALESCE(pr.price_override, p.base_price) AS branch_price
    FROM public.products p
    JOIN public.price_rules pr
      ON pr.product_id = p.id
     AND pr.branch_id = p_branch_id
     AND pr.is_active = true
     AND (pr.effective_from IS NULL OR pr.effective_from <= current_date)
     AND (pr.effective_to IS NULL OR pr.effective_to >= current_date)
    WHERE p.is_active = true
      AND p.category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid
      AND p.name NOT IN ('Trial Lesson', 'Private Lesson')
    ORDER BY p.id, pr.price_override NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x
  ORDER BY x.product_name;
$function$;