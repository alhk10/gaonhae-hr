CREATE TABLE public.limited_edition_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_urls text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  designs text[] NOT NULL DEFAULT '{}',
  price numeric NOT NULL DEFAULT 0,
  branch_ids text[],
  is_active boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  stock_limit integer,
  product_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.limited_edition_products TO service_role;
ALTER TABLE public.limited_edition_products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_le_updated BEFORE UPDATE ON public.limited_edition_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public._le_sold(p_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(COALESCE((it->>'qty')::int,1)),0)::int
  FROM public.guards_purchases g, jsonb_array_elements(COALESCE(g.items,'[]'::jsonb)) it
  WHERE COALESCE(g.sale_status,'') NOT IN ('rejected','cancelled')
    AND it->>'key' LIKE 'le:' || p_id::text || '%'
$$;
REVOKE ALL ON FUNCTION public._le_sold(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_limited_edition_list(p_password text)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._settings_guard(p_password, NULL, true);
  RETURN QUERY SELECT to_jsonb(l) || jsonb_build_object('sold', public._le_sold(l.id))
    FROM public.limited_edition_products l ORDER BY l.sort_order, l.created_at DESC;
END $$;

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
    INSERT INTO public.products(name, base_price, category_id, is_service)
    VALUES ('Limited Edition - ' || v_name, v_price, 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c', false)
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

CREATE OR REPLACE FUNCTION public.access_limited_edition_delete(p_password text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._settings_guard(p_password, NULL, true);
  DELETE FROM public.limited_edition_products WHERE id = p_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_limited_editions(p_branch_id text)
RETURNS TABLE(id uuid, name text, description text, image_urls text[], sizes text[], designs text[], price numeric, product_id uuid, remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.name, l.description, l.image_urls, l.sizes, l.designs, l.price, l.product_id,
         CASE WHEN l.stock_limit IS NULL THEN NULL ELSE GREATEST(l.stock_limit - public._le_sold(l.id), 0) END
  FROM public.limited_edition_products l
  WHERE l.is_active
    AND (l.branch_ids IS NULL OR p_branch_id = ANY(l.branch_ids))
    AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Asia/Singapore')::date)
    AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Asia/Singapore')::date)
    AND (l.stock_limit IS NULL OR public._le_sold(l.id) < l.stock_limit)
  ORDER BY l.sort_order, l.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.access_limited_edition_list(text), public.access_limited_edition_upsert(text, jsonb),
  public.access_limited_edition_delete(text, uuid), public.get_public_limited_editions(text) TO anon, authenticated;