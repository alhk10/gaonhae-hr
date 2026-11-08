DO $mig$
DECLARE d text;
BEGIN
  -- 1. Student product list: show items unless the branch switched them off
  d := pg_get_functiondef('public.get_public_chat_products_for_student'::regproc);
  d := replace(d, 'AND gbp.is_available = true', 'AND COALESCE(gbp.is_available, true)');
  EXECUTE d;

  -- 2. Checkout: accept guard packages (server-priced, no catalogue product)
  d := pg_get_functiondef('public.submit_public_chat_invoice(uuid,uuid,text,text,jsonb,numeric,text,text,text)'::regprocedure);
  d := replace(d,
$a$    SELECT p.id, p.name, COALESCE(p.metadata, '{}'::jsonb) AS metadata INTO v_product
    FROM public.products p WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid LIMIT 1;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Invalid product in cart'; END IF;$a$,
$b$    IF NULLIF(v_item->>'package_key', '') IS NOT NULL THEN
      SELECT NULL::uuid AS id, g.name, jsonb_build_object('guards_package', g.item_key) AS metadata, g.price
        INTO v_product
      FROM public.get_public_guards_products(p_branch_id) g
      WHERE g.item_type = 'package' AND g.item_key = v_item->>'package_key' LIMIT 1;
      IF v_product.name IS NULL THEN RAISE EXCEPTION 'Package not available'; END IF;
      v_customer_unit := v_product.price;
    ELSE
      SELECT p.id, p.name, COALESCE(p.metadata, '{}'::jsonb) AS metadata, NULL::numeric AS price INTO v_product
      FROM public.products p WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid LIMIT 1;
      IF v_product.id IS NULL THEN RAISE EXCEPTION 'Invalid product in cart'; END IF;
    END IF;$b$);
  d := replace(d, $c$'tax_inclusive', v_tax_inclusive
      ),$c$, $e$'tax_inclusive', v_tax_inclusive,
        'guards_package', v_product.metadata->>'guards_package'
      ),$e$);
  IF position('package_key' in d) = 0 OR position($f$'guards_package', v_product$f$ in d) = 0 THEN
    RAISE EXCEPTION 'submit patch failed';
  END IF;
  EXECUTE d;

  -- 3. /access Guards list: include package lines
  d := pg_get_functiondef('public.get_public_guards_purchase_list'::regproc);
  d := replace(d,
$g$     FROM public.invoice_items ii JOIN public.products p ON p.id = ii.product_id
     WHERE ii.invoice_id = i.id AND p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1')),$g$,
$h$     FROM public.invoice_items ii LEFT JOIN public.products p ON p.id = ii.product_id
     WHERE ii.invoice_id = i.id AND (p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1') OR ii.metadata ? 'guards_package' AND ii.metadata->>'guards_package' IS NOT NULL)),$h$);
  d := replace(d,
$i$    AND EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.products p ON p.id = ii.product_id
                WHERE ii.invoice_id = i.id AND p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1'))$i$,
$j$    AND EXISTS (SELECT 1 FROM public.invoice_items ii LEFT JOIN public.products p ON p.id = ii.product_id
                WHERE ii.invoice_id = i.id AND (p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1') OR ii.metadata->>'guards_package' IS NOT NULL))$j$);
  IF position('guards_package' in d) = 0 THEN RAISE EXCEPTION 'list patch failed'; END IF;
  EXECUTE d;
END $mig$;