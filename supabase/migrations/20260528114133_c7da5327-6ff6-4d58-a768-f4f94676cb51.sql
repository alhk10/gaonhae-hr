
CREATE OR REPLACE FUNCTION public.submit_guards_purchase(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
  _ref text;
BEGIN
  INSERT INTO public.guards_purchases (
    first_name, last_name, date_of_birth, branch_id, gender, current_belt,
    email, phone, items, subtotal, gst_amount, total, payment_method,
    proof_url, variant_selections, sale_status
  ) VALUES (
    NULLIF(_row->>'first_name',''),
    NULLIF(_row->>'last_name',''),
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'branch_id',''),
    NULLIF(_row->>'gender',''),
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'email',''),
    NULLIF(_row->>'phone',''),
    COALESCE(_row->'items', '[]'::jsonb),
    COALESCE((_row->>'subtotal')::numeric, 0),
    COALESCE((_row->>'gst_amount')::numeric, 0),
    COALESCE((_row->>'total')::numeric, 0),
    NULLIF(_row->>'payment_method',''),
    NULLIF(_row->>'proof_url',''),
    CASE WHEN _row ? 'variant_selections' THEN _row->'variant_selections' ELSE NULL END,
    'pending_verification'
  )
  RETURNING guards_purchases.id, guards_purchases.reference_number
  INTO _new_id, _ref;

  id := _new_id;
  reference_number := _ref;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guards_purchase(jsonb) TO anon, authenticated;
