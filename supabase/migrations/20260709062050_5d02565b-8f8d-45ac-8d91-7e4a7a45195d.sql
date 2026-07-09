CREATE OR REPLACE FUNCTION public.get_public_payment_options(
  p_branch_id text,
  p_current_belt text
)
RETURNS TABLE (
  branch_country text,
  paynow_qr_url text,
  bank_transfer_info text,
  product_id uuid,
  product_name text,
  product_price numeric,
  slot_id uuid,
  slot_date date,
  slot_start time,
  slot_end time,
  slot_location text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text;
  v_qr text;
  v_bank text;
  v_product record;
  v_slot record;
BEGIN
  SELECT country INTO v_country FROM public.branches WHERE id = p_branch_id;

  SELECT it.paynow_qr_url, it.bank_transfer_info
  INTO v_qr, v_bank
  FROM public.invoice_templates it
  WHERE it.is_active = true
    AND (it.branch_id = p_branch_id OR it.branch_id IS NULL)
  ORDER BY (it.branch_id = p_branch_id) DESC NULLS LAST
  LIMIT 1;

  -- PayNow is Singapore-only. Strip the QR for any non-SG branch as a defense-in-depth guard.
  IF lower(coalesce(v_country, '')) <> 'singapore' THEN
    v_qr := NULL;
  END IF;

  SELECT p.id, p.name, p.base_price
  INTO v_product
  FROM public.products p
  JOIN public.product_categories pc ON pc.id = p.category_id
  WHERE p.is_active = true
    AND lower(pc.name) = 'grading'
    AND p_current_belt IS NOT NULL
    AND lower(p.name) LIKE lower(p_current_belt || ' >>%')
  ORDER BY length(p.name)
  LIMIT 1;

  SELECT gs.id, gs.grading_date, gs.start_time, gs.end_time, gs.location
  INTO v_slot
  FROM public.grading_slots gs
  WHERE gs.grading_date >= CURRENT_DATE
    AND (gs.status IS NULL OR gs.status <> 'cancelled')
    AND (gs.branch_id = p_branch_id OR p_branch_id = ANY(COALESCE(gs.available_branch_ids, ARRAY[]::text[])))
    AND (p_current_belt IS NULL OR p_current_belt = ANY(COALESCE(gs.belt_levels, ARRAY[]::text[])))
  ORDER BY gs.grading_date, gs.start_time
  LIMIT 1;

  RETURN QUERY SELECT
    v_country,
    v_qr,
    v_bank,
    v_product.id,
    v_product.name,
    v_product.base_price,
    v_slot.id,
    v_slot.grading_date,
    v_slot.start_time,
    v_slot.end_time,
    v_slot.location;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_payment_options(text, text) TO anon, authenticated;