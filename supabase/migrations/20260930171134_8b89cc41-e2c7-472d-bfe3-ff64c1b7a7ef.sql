CREATE OR REPLACE FUNCTION public.get_public_invoice_full(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_invoice_id IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'id', i.id, 'invoice_number', i.invoice_number, 'issue_date', i.issue_date, 'due_date', i.due_date,
    'subtotal', COALESCE(i.subtotal, 0), 'tax_amount', COALESCE(i.tax_amount, 0),
    'discount_amount', COALESCE(i.discount_amount, 0), 'total_amount', COALESCE(i.total_amount, 0),
    'amount_paid', COALESCE(i.amount_paid, 0), 'balance_due', COALESCE(i.balance_due, 0),
    'notes', i.notes, 'status', i.status,
    'student', jsonb_build_object(
      'name', COALESCE(COALESCE(NULLIF(trim(concat_ws(' ', st.first_name, st.last_name)), ''), st.display_name), ''),
      'address', st.address, 'phone', st.phone, 'email', st.email),
    'branch', jsonb_build_object('name', COALESCE(b.name, ''), 'address', b.address, 'country', b.country),
    'template', CASE WHEN tmpl.id IS NULL THEN NULL ELSE jsonb_build_object(
      'country', tmpl.country, 'letterhead_url', tmpl.letterhead_url, 'logo_url', tmpl.logo_url,
      'paynow_qr_url', tmpl.paynow_qr_url, 'bank_transfer_info', tmpl.bank_transfer_info,
      'default_notes', tmpl.default_notes, 'footer_text', tmpl.footer_text) END,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'description', it.description, 'quantity', COALESCE(it.quantity, 1),
        'unit_price', COALESCE(it.unit_price, 0), 'total_price', COALESCE(it.total_amount, 0),
        'refunded', COALESCE(it.metadata->>'refunded','false') = 'true'
      ) ORDER BY it.created_at)
      FROM public.invoice_items it WHERE it.invoice_id = i.id), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'payment_number', p.payment_number, 'payment_method', p.payment_method, 'payment_date', p.payment_date,
        'amount', COALESCE(p.amount, 0), 'reference_number', p.reference_number,
        'verification_status', p.verification_status) ORDER BY p.payment_date)
      FROM public.payments p WHERE p.invoice_id = i.id), '[]'::jsonb)
  ) INTO v_result
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (
    SELECT t.id, t.country, t.letterhead_url, t.logo_url, t.paynow_qr_url,
           t.bank_transfer_info, t.default_notes, t.footer_text
    FROM public.invoice_templates t
    WHERE t.is_active AND t.country = CASE WHEN b.country IN ('Australia', 'AU') THEN 'AU' WHEN b.country IN ('Singapore', 'SG') THEN 'SG' ELSE NULL END
    ORDER BY t.created_at DESC LIMIT 1
  ) tmpl ON true
  WHERE i.id = p_invoice_id;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_school_fees_invoice(p_submission_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_invoice_id uuid;
BEGIN
  SELECT s.matched_invoice_id INTO v_invoice_id
  FROM public.public_chat_payment_submissions s WHERE s.id = p_submission_id;
  IF v_invoice_id IS NULL THEN RETURN NULL; END IF;
  RETURN public.get_public_invoice_full(v_invoice_id);
END;
$function$;