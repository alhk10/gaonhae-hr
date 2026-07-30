CREATE OR REPLACE FUNCTION public.get_public_school_fees_invoice(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_result jsonb;
BEGIN
  SELECT s.matched_invoice_id INTO v_invoice_id
  FROM public.public_chat_payment_submissions s
  WHERE s.id = p_submission_id;

  IF v_invoice_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'subtotal', COALESCE(i.subtotal, 0),
    'tax_amount', COALESCE(i.tax_amount, 0),
    'discount_amount', COALESCE(i.discount_amount, 0),
    'total_amount', COALESCE(i.total_amount, 0),
    'amount_paid', COALESCE(i.amount_paid, 0),
    'balance_due', COALESCE(i.balance_due, 0),
    'notes', i.notes,
    'status', i.status,
    'student', jsonb_build_object(
      'name', COALESCE(st.name, ''),
      'address', st.address,
      'phone', st.phone,
      'email', st.email
    ),
    'branch', jsonb_build_object(
      'name', COALESCE(b.name, ''),
      'address', b.address
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'description', it.description,
        'quantity', COALESCE(it.quantity, 1),
        'unit_price', COALESCE(it.unit_price, 0),
        'total_price', COALESCE(it.total_price, 0)
      ) ORDER BY it.created_at)
      FROM public.invoice_items it
      WHERE it.invoice_id = i.id
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'payment_number', p.payment_number,
        'payment_method', p.payment_method,
        'payment_date', p.payment_date,
        'amount', COALESCE(p.amount, 0),
        'reference_number', p.reference_number,
        'verification_status', p.verification_status
      ) ORDER BY p.payment_date)
      FROM public.payments p
      WHERE p.invoice_id = i.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  WHERE i.id = v_invoice_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_fees_invoice(uuid) TO anon, authenticated, service_role;