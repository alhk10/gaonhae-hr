DROP FUNCTION IF EXISTS public.list_external_invoice_products(text, text);
CREATE FUNCTION public.list_external_invoice_products(p_password text, p_branch_id text)
 RETURNS TABLE(id uuid, name text, category text, is_active boolean, is_physical boolean, base_price numeric, branch_price numeric, available_sizes text[], stock_on_hand integer, available_variants jsonb, variant_stock jsonb)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_scope text := _access_scope(p_password);
BEGIN
  IF v_scope <> '*' AND p_branch_id IS DISTINCT FROM v_scope THEN RAISE EXCEPTION 'Not your branch'; END IF;
  RETURN QUERY
  SELECT p.id, p.name, coalesce(c.name,'Other'), coalesce(p.is_active,false),
    (coalesce(p.is_service,false)=false AND coalesce(p.is_lesson,false)=false),
    p.base_price,
    coalesce(
      (SELECT g.price_override FROM guards_branch_products g WHERE g.product_id=p.id AND g.branch_id=p_branch_id AND g.price_override IS NOT NULL LIMIT 1),
      (SELECT r.price_override FROM price_rules r WHERE r.product_id=p.id AND r.branch_id=p_branch_id AND coalesce(r.is_active,true)
         AND r.belt_min IS NULL AND r.belt_max IS NULL AND r.price_override IS NOT NULL
         AND (r.effective_from IS NULL OR r.effective_from<=current_date) AND (r.effective_to IS NULL OR r.effective_to>=current_date)
       ORDER BY r.updated_at DESC LIMIT 1),
      p.base_price),
    p.available_sizes,
    (SELECT sum(ii.quantity_on_hand)::int FROM inventory_items ii JOIN inventory_locations l ON l.id=ii.location_id
      WHERE ii.product_id=p.id AND l.branch_id=p_branch_id AND l.is_active),
    p.available_variants::jsonb,
    (SELECT jsonb_object_agg(s.k, s.q) FROM (SELECT coalesce(ii.size_variant,'') k, sum(ii.quantity_on_hand)::int q
       FROM inventory_items ii JOIN inventory_locations l ON l.id=ii.location_id
       WHERE ii.product_id=p.id AND l.branch_id=p_branch_id AND l.is_active GROUP BY 1) s)
  FROM products p LEFT JOIN product_categories c ON c.id=p.category_id
  ORDER BY coalesce(c.name,'Other'), p.name;
END $function$;
GRANT EXECUTE ON FUNCTION public.list_external_invoice_products(text, text) TO anon, authenticated;