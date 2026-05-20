
CREATE OR REPLACE FUNCTION public.get_public_chat_products(p_branch_id text, p_category_id uuid)
RETURNS TABLE(product_id uuid, product_name text, base_price numeric, branch_price numeric, requires_size boolean, available_sizes text[], available_variants jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(pr.price_override, p.base_price) AS branch_price,
    p.requires_size,
    p.available_sizes,
    p.available_variants
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id AND pr.branch_id = p_branch_id AND pr.is_active = true
  WHERE p.is_active = true
    AND p.category_id = p_category_id
  ORDER BY p.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_chat_products(text, uuid) TO anon, authenticated;
