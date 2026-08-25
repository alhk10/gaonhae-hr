DROP FUNCTION IF EXISTS public.public_set_guards_collected(uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.public_set_guards_collected(p_id uuid, p_collected boolean, p_by text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.guards_purchases%ROWTYPE;
BEGIN
  UPDATE public.guards_purchases
  SET collected = p_collected,
      collected_at = CASE WHEN p_collected THEN now() ELSE NULL END,
      collected_by = CASE WHEN p_collected THEN p_by ELSE NULL END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  RETURN jsonb_build_object(
    'email', v_row.email,
    'first_name', v_row.first_name,
    'reference_number', v_row.reference_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_set_guards_collected(uuid, boolean, text) TO anon, authenticated;