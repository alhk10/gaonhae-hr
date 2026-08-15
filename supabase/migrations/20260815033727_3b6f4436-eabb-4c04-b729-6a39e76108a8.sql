DROP FUNCTION IF EXISTS public.get_public_guards_products(text);

CREATE OR REPLACE FUNCTION public.get_public_guards_products(p_branch_id text)
 RETURNS TABLE(item_key text, product_id uuid, item_type text, name text, description text, price numeric, requires_size boolean, available_sizes text[], requires_color boolean, category_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH packages(item_key, name, description, default_price) AS (
    VALUES
      ('gaonhae_set', 'Gaonhae Protection Guard Set', 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag', 174.40::numeric),
      ('adidas_set', 'Preorder - Adidas Chest Guard + Head Gear Set', 'Adidas Chestguard + Adidas Headgear', 284.30::numeric)
  )
  SELECT pk.item_key, NULL::uuid, 'package'::text, pk.name, pk.description,
         COALESCE(s.price_override, pk.default_price), false, NULL::text[], false, 'Packages'::text
  FROM packages pk
  LEFT JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = pk.item_key
  WHERE COALESCE(s.is_available, true)
  UNION ALL
  SELECT p.id::text, p.id, 'product'::text, p.name, p.description,
         COALESCE(s.price_override, p.base_price), COALESCE(p.requires_size, false),
         p.available_sizes, COALESCE(p.requires_color, false), c.name
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  WHERE p.is_active AND s.is_available
    AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
  ORDER BY 3 DESC, 4;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_guards_products(text) TO anon, authenticated, service_role;