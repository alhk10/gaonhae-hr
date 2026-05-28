CREATE OR REPLACE FUNCTION public.get_public_competition_products()
RETURNS TABLE(id uuid, name text, base_price numeric, tax_rate numeric, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.base_price, p.tax_rate, p.kind
  FROM public.products p
  WHERE p.kind = 'competition' AND p.is_active = true
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_competition_products() TO anon, authenticated;