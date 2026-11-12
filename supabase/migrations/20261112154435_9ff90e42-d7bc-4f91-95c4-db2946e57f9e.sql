CREATE OR REPLACE FUNCTION public._impl_guards_products_for_branch_admin(p_branch_id text)
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
  SELECT p.id::text, p.id, 'product'::text, p.name, p.description, COALESCE(r.price_override, p.base_price),
         COALESCE(s.is_available, true), s.price_override, p.min_age::integer, p.max_age::integer, p.allowed_belt_levels::text[]
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  LEFT JOIN LATERAL (
    SELECT pr.price_override FROM public.price_rules pr
    WHERE pr.product_id = p.id AND pr.branch_id::text = p_branch_id AND pr.is_active
      AND pr.price_override IS NOT NULL
      AND (pr.effective_from IS NULL OR pr.effective_from <= current_date)
      AND (pr.effective_to IS NULL OR pr.effective_to >= current_date)
    ORDER BY pr.effective_from DESC NULLS LAST, pr.created_at DESC LIMIT 1
  ) r ON true
  WHERE p.is_active AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
    AND COALESCE(p.sku, '') NOT LIKE 'PKG-%'
  ORDER BY 3 DESC, 4;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_guards_products(p_branch_id text)
 RETURNS TABLE(item_key text, product_id uuid, item_type text, name text, description text, price numeric, requires_size boolean, available_sizes text[], requires_color boolean, category_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
         COALESCE(s.price_override, r.price_override, p.base_price), COALESCE(p.requires_size, false),
         p.available_sizes, COALESCE(p.requires_color, false), c.name
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.guards_branch_products s ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  LEFT JOIN LATERAL (
    SELECT pr.price_override FROM public.price_rules pr
    WHERE pr.product_id = p.id AND pr.branch_id::text = p_branch_id AND pr.is_active
      AND pr.price_override IS NOT NULL
      AND (pr.effective_from IS NULL OR pr.effective_from <= current_date)
      AND (pr.effective_to IS NULL OR pr.effective_to >= current_date)
    ORDER BY pr.effective_from DESC NULLS LAST, pr.created_at DESC LIMIT 1
  ) r ON true
  WHERE p.is_active AND COALESCE(s.is_available, true)
    AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
    AND COALESCE(p.sku, '') NOT LIKE 'PKG-%'
  ORDER BY 3 DESC, 4;
$function$;