CREATE OR REPLACE FUNCTION public.public_set_guards_variant_selections(p_id uuid, p_selections jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guards_purchases
  SET variant_selections = p_selections
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_set_guards_variant_selections(uuid, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_set_guards_collected(p_id uuid, p_collected boolean, p_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guards_purchases
  SET collected = p_collected,
      collected_at = CASE WHEN p_collected THEN now() ELSE NULL END,
      collected_by = CASE WHEN p_collected THEN p_by ELSE NULL END
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_set_guards_collected(uuid, boolean, text) TO anon, authenticated;