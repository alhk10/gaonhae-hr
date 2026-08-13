CREATE OR REPLACE FUNCTION public.admin_list_grading_products()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  WHERE p.is_active = true AND c.name = 'Grading'
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_grading_products() TO anon, authenticated;