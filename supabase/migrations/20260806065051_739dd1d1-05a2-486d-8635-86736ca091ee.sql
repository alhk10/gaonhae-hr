CREATE TABLE public.guards_branch_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  item_key text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  price_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  UNIQUE (branch_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guards_branch_products TO authenticated;
GRANT ALL ON public.guards_branch_products TO service_role;

ALTER TABLE public.guards_branch_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view guards branch products"
ON public.guards_branch_products FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_guards_branch_products_updated_at
BEFORE UPDATE ON public.guards_branch_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Candidate items for a branch (packages + uniform/guard products) with settings applied
CREATE OR REPLACE FUNCTION public.get_guards_products_for_branch_admin(p_branch_id uuid)
RETURNS TABLE (
  item_key text,
  product_id uuid,
  item_type text,
  name text,
  description text,
  default_price numeric,
  is_available boolean,
  price_override numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH packages(item_key, name, description, default_price) AS (
    VALUES
      ('gaonhae_set', 'Gaonhae Protection Guard Set', 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag', 174.40::numeric),
      ('adidas_set', 'Preorder - Adidas Chest Guard + Head Gear Set', 'Adidas Chestguard + Adidas Headgear', 284.30::numeric)
  )
  SELECT
    pk.item_key,
    NULL::uuid,
    'package'::text,
    pk.name,
    pk.description,
    pk.default_price,
    COALESCE(s.is_available, true),
    s.price_override
  FROM packages pk
  LEFT JOIN public.guards_branch_products s
    ON s.branch_id = p_branch_id AND s.item_key = pk.item_key
  UNION ALL
  SELECT
    p.id::text,
    p.id,
    'product'::text,
    p.name,
    p.description,
    p.base_price,
    COALESCE(s.is_available, false),
    s.price_override
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.guards_branch_products s
    ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  WHERE p.is_active
    AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
  ORDER BY 3 DESC, 4;
$$;

GRANT EXECUTE ON FUNCTION public.get_guards_products_for_branch_admin(uuid) TO authenticated, service_role;

-- Public read: only available items with effective price
CREATE OR REPLACE FUNCTION public.get_public_guards_products(p_branch_id uuid)
RETURNS TABLE (
  item_key text,
  product_id uuid,
  item_type text,
  name text,
  description text,
  price numeric,
  requires_size boolean,
  available_sizes text[],
  requires_color boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH packages(item_key, name, description, default_price) AS (
    VALUES
      ('gaonhae_set', 'Gaonhae Protection Guard Set', 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag', 174.40::numeric),
      ('adidas_set', 'Preorder - Adidas Chest Guard + Head Gear Set', 'Adidas Chestguard + Adidas Headgear', 284.30::numeric)
  )
  SELECT
    pk.item_key,
    NULL::uuid,
    'package'::text,
    pk.name,
    pk.description,
    COALESCE(s.price_override, pk.default_price),
    false,
    NULL::text[],
    false
  FROM packages pk
  LEFT JOIN public.guards_branch_products s
    ON s.branch_id = p_branch_id AND s.item_key = pk.item_key
  WHERE COALESCE(s.is_available, true)
  UNION ALL
  SELECT
    p.id::text,
    p.id,
    'product'::text,
    p.name,
    p.description,
    COALESCE(s.price_override, p.base_price),
    COALESCE(p.requires_size, false),
    p.available_sizes,
    COALESCE(p.requires_color, false)
  FROM public.products p
  JOIN public.product_categories c ON c.id = p.category_id
  JOIN public.guards_branch_products s
    ON s.branch_id = p_branch_id AND s.item_key = p.id::text
  WHERE p.is_active
    AND s.is_available
    AND c.name IN ('Uniforms & Apparels', 'Protection Guards & Accessories')
  ORDER BY 3 DESC, 4;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_guards_products(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_guards_product_branch_setting(
  p_branch_id uuid,
  p_item_key text,
  p_product_id uuid,
  p_available boolean,
  p_price_override numeric,
  p_actor text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.guards_branch_products (branch_id, item_key, product_id, is_available, price_override, updated_by)
  VALUES (p_branch_id, p_item_key, p_product_id, p_available, p_price_override, p_actor)
  ON CONFLICT (branch_id, item_key) DO UPDATE
    SET is_available = EXCLUDED.is_available,
        price_override = EXCLUDED.price_override,
        product_id = EXCLUDED.product_id,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_guards_product_branch_setting(uuid, text, uuid, boolean, numeric, text) TO anon, authenticated, service_role;