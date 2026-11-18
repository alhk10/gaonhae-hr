CREATE OR REPLACE FUNCTION public.access_limited_edition_upsert(p_password text, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := NULLIF(p_row->>'id','')::uuid; v_pid uuid; v_name text; v_price numeric;
BEGIN
  PERFORM public._settings_guard(p_password, NULL, true);
  v_name := btrim(COALESCE(p_row->>'name',''));
  IF v_name = '' THEN RAISE EXCEPTION 'Name is required'; END IF;
  v_price := COALESCE((p_row->>'price')::numeric, 0);
  IF v_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
  IF v_id IS NOT NULL THEN SELECT product_id INTO v_pid FROM public.limited_edition_products WHERE id = v_id; END IF;
  IF v_pid IS NULL THEN
    INSERT INTO public.products(sku, name, base_price, category_id, is_service)
    VALUES ('LE-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), 'Limited Edition - ' || v_name, v_price, 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c', false)
    RETURNING id INTO v_pid;
  ELSE
    UPDATE public.products SET name = 'Limited Edition - ' || v_name, base_price = v_price WHERE id = v_pid;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.limited_edition_products(name, product_id) VALUES (v_name, v_pid) RETURNING id INTO v_id;
  END IF;
  UPDATE public.limited_edition_products SET
    name = v_name,
    description = NULLIF(p_row->>'description',''),
    image_urls = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_row->'image_urls')), '{}'),
    sizes = COALESCE(ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(p_row->'sizes') x WHERE btrim(x) <> ''), '{}'),
    designs = COALESCE(ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(p_row->'designs') x WHERE btrim(x) <> ''), '{}'),
    price = v_price,
    branch_ids = CASE WHEN jsonb_typeof(p_row->'branch_ids') = 'array' AND jsonb_array_length(p_row->'branch_ids') > 0
                      THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'branch_ids')) ELSE NULL END,
    is_active = COALESCE((p_row->>'is_active')::boolean, true),
    starts_on = NULLIF(p_row->>'starts_on','')::date,
    ends_on = NULLIF(p_row->>'ends_on','')::date,
    stock_limit = NULLIF(p_row->>'stock_limit','')::int,
    product_id = v_pid
  WHERE id = v_id;
  RETURN v_id;
END $$;