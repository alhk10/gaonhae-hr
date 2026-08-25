CREATE OR REPLACE FUNCTION public.public_set_guards_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('verified','rejected','pending_verification','cancelled') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  UPDATE public.guards_purchases
  SET sale_status = p_status
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_set_guards_status(uuid, text) TO anon, authenticated;