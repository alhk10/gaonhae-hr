CREATE OR REPLACE FUNCTION public.get_branch_unit_prices(p_branch_id text)
RETURNS TABLE(product_id uuid, unit_price numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    COALESCE(
      (SELECT g.price_override FROM guards_branch_products g WHERE g.product_id=p.id AND g.branch_id=p_branch_id AND g.price_override IS NOT NULL AND COALESCE(g.is_available,true) LIMIT 1),
      (SELECT r.price_override FROM price_rules r WHERE r.product_id=p.id AND r.branch_id=p_branch_id AND r.is_active AND r.price_override IS NOT NULL LIMIT 1),
      p.base_price)
  FROM products p;
$$;
GRANT EXECUTE ON FUNCTION public.get_branch_unit_prices(text) TO anon, authenticated, service_role;