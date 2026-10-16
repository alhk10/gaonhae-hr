DROP FUNCTION IF EXISTS public.get_guards_products_for_branch_admin(text);
CREATE FUNCTION public.get_guards_products_for_branch_admin(p_branch_id text)
 RETURNS TABLE(item_key text, product_id uuid, item_type text, name text, description text, default_price numeric, is_available boolean, price_override numeric, min_age integer, max_age integer, allowed_belt_levels text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH packages(item_key, name, description, default_price) AS (
    VALUES
      ('gaonhae_set', 'Gaonhae Protection Guard Set', 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag', 174.40::numeric),
      ('adidas_set', 'Preorder - Adidas Chest Guard + Head Gear Set', 'Adidas Chestguard + Adidas Headgear', 284.30::numeric)
  )
  SELECT pk.item_key, NULL::uuid, 'package'::text, pk.name, pk.description, pk.default_price,
         COALESCE(s.is_available, true), s.price_override, NULL::integer, NULL::integer, NULL::text[]
  FROM packages pk
  LEFT JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = pk.item_key
  UNION ALL
  SELECT p.id::text, p.id, 'product'::text, p.name, p.description, p.base_price,
         COALESCE(s.is_available, false), s.price_override, p.min_age::integer, p.max_age::integer, p.allowed_belt_levels::text[]
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  WHERE p.is_active AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
  ORDER BY 3 DESC, 4;
$function$;
GRANT EXECUTE ON FUNCTION public.get_guards_products_for_branch_admin(text) TO anon, authenticated, service_role;