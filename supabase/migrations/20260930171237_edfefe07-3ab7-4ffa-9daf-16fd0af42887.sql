CREATE OR REPLACE FUNCTION public.get_public_chat_invoices(p_session_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_student RECORD; v_result jsonb;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN '[]'::jsonb; END IF;
  SELECT s.id, s.first_name, s.last_name, s.address, s.phone, s.email, s.branch_id
    INTO v_student FROM public.students s WHERE s.id = p_student_id;
  IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', inv.id, 'invoice_number', inv.invoice_number, 'issue_date', inv.issue_date,
    'due_date', inv.due_date, 'status', inv.status, 'subtotal', inv.subtotal,
    'tax_amount', inv.tax_amount, 'discount_amount', inv.discount_amount,
    'total_amount', inv.total_amount, 'amount_paid', inv.amount_paid,
    'balance_due', inv.balance_due, 'notes', inv.notes,
    'template', CASE WHEN tmpl.id IS NULL THEN NULL ELSE jsonb_build_object(
      'letterhead_url', tmpl.letterhead_url, 'logo_url', tmpl.logo_url,
      'paynow_qr_url', tmpl.paynow_qr_url, 'country', tmpl.country,
      'bank_transfer_info', tmpl.bank_transfer_info, 'default_notes', tmpl.default_notes,
      'footer_text', tmpl.footer_text) END,
    'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', it.id, 'description', it.description, 'quantity', it.quantity,
      'unit_price', it.unit_price, 'tax_rate', it.tax_rate,
      'tax_amount', it.tax_amount, 'total_amount', it.total_amount,
      'metadata', it.metadata,
      'term_info', (SELECT tc.name || ' (' || to_char(tc.start_date, 'DD/MM/YYYY') || ' - ' || to_char(tc.end_date, 'DD/MM/YYYY') || ')'
        FROM public.term_calendars tc WHERE tc.id = NULLIF(it.metadata->>'term_id', '')::uuid),
      'grading_info', (SELECT to_char(gs.grading_date, 'DD/MM/YYYY') ||
        CASE WHEN gs.start_time IS NOT NULL THEN ' at ' || to_char(gs.start_time, 'HH24:MI') ELSE '' END
        FROM public.grading_slots gs WHERE gs.id = NULLIF(it.metadata->>'grading_slot_id', '')::uuid)
      ) ORDER BY it.created_at), '[]'::jsonb)
      FROM public.invoice_items it WHERE it.invoice_id = inv.id)
    ) ORDER BY inv.issue_date DESC, inv.created_at DESC), '[]'::jsonb)
    INTO v_result FROM public.invoices inv
    LEFT JOIN public.branches b ON b.id = inv.branch_id
    LEFT JOIN LATERAL (
      SELECT t.id, t.letterhead_url, t.logo_url, t.paynow_qr_url, t.country,
             t.bank_transfer_info, t.default_notes, t.footer_text
      FROM public.invoice_templates t
      WHERE t.is_active AND t.country = CASE WHEN b.country IN ('Australia', 'AU') THEN 'AU' WHEN b.country IN ('Singapore', 'SG') THEN 'SG' ELSE NULL END
      ORDER BY t.created_at DESC LIMIT 1
    ) tmpl ON true
    WHERE inv.student_id = p_student_id AND inv.status <> 'cancelled';

  RETURN jsonb_build_object(
    'student', jsonb_build_object('name', upper(trim(v_student.first_name || ' ' || v_student.last_name)),
      'address', v_student.address, 'phone', v_student.phone, 'email', v_student.email),
    'template', NULL, 'invoices', v_result);
END;
$function$;