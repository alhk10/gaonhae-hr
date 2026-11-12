CREATE OR REPLACE FUNCTION public.get_invoice_package_products(p_branch_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pk(item_key, name) AS (VALUES
    ('gaonhae_set','Gaonhae Protection Guard Set'),
    ('adidas_set','Preorder - Adidas Chest Guard + Head Gear Set'))
  SELECT COALESCE(jsonb_agg(
    to_jsonb(p) || jsonb_build_object(
      'is_active', true,
      'base_price', COALESCE(s.price_override, p.base_price),
      'product_categories', jsonb_build_object('name', pc.name))
    ORDER BY p.name), '[]'::jsonb)
  FROM pk JOIN products p ON p.name = pk.name
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN guards_branch_products s ON p_branch_id IS NOT NULL AND s.branch_id = p_branch_id AND s.item_key = pk.item_key
  WHERE COALESCE(s.is_available, true);
$$;
GRANT EXECUTE ON FUNCTION public.get_invoice_package_products(text) TO anon, authenticated;