INSERT INTO public.products (sku, name, description, base_price, is_active, category_id, metadata)
SELECT v.sku, v.name, v.descr, v.price, false,
       (SELECT id FROM public.product_categories WHERE name = 'Protection Guards & Accessories' LIMIT 1),
       jsonb_build_object('guards_package_product', v.key)
FROM (VALUES
  ('PKG-GAONHAE-SET', 'Gaonhae Protection Guard Set', 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag', 174.40::numeric, 'gaonhae_set'),
  ('PKG-ADIDAS-SET', 'Preorder - Adidas Chest Guard + Head Gear Set', 'Adidas Chestguard + Adidas Headgear', 284.30::numeric, 'adidas_set')
) v(sku, name, descr, price, key)
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.metadata->>'guards_package_product' = v.key);

DO $m$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.proname = 'submit_public_chat_invoice';
  d := replace(d, 'SELECT NULL::uuid AS id, g.name,',
    'SELECT (SELECT pp.id FROM public.products pp WHERE pp.metadata->>''guards_package_product'' = g.item_key LIMIT 1) AS id, g.name,');
  d := replace(d, 'IF v_product.name IS NULL THEN RAISE EXCEPTION ''Package not available''; END IF;',
    'IF v_product.name IS NULL OR v_product.id IS NULL THEN RAISE EXCEPTION ''Package not available''; END IF;');
  IF position('guards_package_product' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE d;
END $m$;