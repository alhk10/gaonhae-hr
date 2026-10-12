-- 1. Track running refunded-as-credit total on invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

-- Backfill from existing fully refunded line items
UPDATE public.invoices i
SET refunded_amount = COALESCE((
  SELECT SUM(it.total_amount + it.tax_amount)
  FROM public.invoice_items it
  WHERE it.invoice_id = i.id
    AND (it.metadata->>'refunded')::boolean IS TRUE
), 0);

-- 2. Public invoice detail: include quantity and refunded quantity per line
CREATE OR REPLACE FUNCTION public.get_public_invoice_detail(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'status', i.status,
    'total_amount', i.total_amount,
    'refunded_amount', i.refunded_amount,
    'student_name', upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', it.id,
        'product_name', p.name,
        'description', it.description,
        'quantity', it.quantity,
        'unit_price', it.unit_price,
        'total_amount', it.total_amount,
        'tax_amount', it.tax_amount,
        'metadata', it.metadata
      ) ORDER BY it.created_at)
      FROM public.invoice_items it
       LEFT JOIN public.products p ON p.id = it.product_id
      WHERE it.invoice_id = i.id
    ), '[]'::jsonb)
  )
  FROM public.invoices i
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE i.id = p_invoice_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_invoice_detail(uuid) TO anon, authenticated;

-- 3. Public refund request with per-item quantities
DROP FUNCTION IF EXISTS public.submit_public_refund_request(uuid, uuid[], text, text);

CREATE OR REPLACE FUNCTION public.submit_public_refund_request(
  p_invoice_id uuid,
  p_item_ids uuid[],
  p_reason text,
  p_requested_by text DEFAULT NULL,
  p_quantities jsonb DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv RECORD;
  v_id uuid;
BEGIN
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No items selected';
  END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  SELECT i.id, i.invoice_number, i.status,
         upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))) AS student_name
    INTO v_inv
  FROM public.invoices i
  LEFT JOIN public.students s ON s.id = i.student_id
   WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_inv.status NOT IN ('paid', 'verified', 'partially_paid') THEN
    RAISE EXCEPTION 'Only paid or verified invoices can be refunded';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items it
    WHERE it.invoice_id = p_invoice_id AND it.id = ANY(p_item_ids)
  ) THEN
    RAISE EXCEPTION 'Selected items do not belong to this invoice';
  END IF;

  -- Validate requested quantities against remaining refundable quantity
  IF p_quantities IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.invoice_items it
      WHERE it.invoice_id = p_invoice_id
        AND it.id = ANY(p_item_ids)
        AND COALESCE((p_quantities->>it.id::text)::int, 0) >
            it.quantity - COALESCE((it.metadata->>'refunded_quantity')::int, 0)
    ) THEN
      RAISE EXCEPTION 'Requested refund quantity exceeds remaining quantity';
    END IF;
  END IF;

  INSERT INTO public.invoice_action_requests (
    invoice_id, action_type, request_data, requested_by, requested_by_email,
    invoice_number, student_name, status
  ) VALUES (
    p_invoice_id,
    'item_refund',
    jsonb_build_object(
      'item_id', p_item_ids[1],
      'item_ids', to_jsonb(p_item_ids),
      'quantities', COALESCE(p_quantities, '{}'::jsonb),
      'reason', btrim(p_reason)
    ),
    NULL,
    NULLIF(btrim(COALESCE(p_requested_by, '')), ''),
    v_inv.invoice_number,
    v_inv.student_name,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_public_refund_request(uuid, uuid[], text, text, jsonb) TO anon, authenticated;