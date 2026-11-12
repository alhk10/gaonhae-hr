CREATE OR REPLACE FUNCTION public.access_bank_transactions(p_password text, p_status text DEFAULT NULL, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN jsonb_build_object(
    'sync', (SELECT jsonb_build_object('last_synced_at', s.last_synced_at, 'last_error', s.last_error, 'last_count', s.last_count) FROM public.bank_sync_state s WHERE source = 'anext_email'),
    'rows', coalesce((SELECT jsonb_agg(r ORDER BY r.received_at DESC) FROM (
      SELECT t.id, t.txn_ref, t.amount, t.currency, t.received_at, t.payer_name, t.account_last4, t.method, t.status, t.status_reason,
             t.matched_by, t.matched_at, t.matched_payment_id,
             i.invoice_number, i.id AS invoice_id, i.branch_id, coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), i.customer_name) AS student_name,
             CASE WHEN t.status <> 'matched' THEN (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public._bank_txn_candidates(t.id) c) END AS candidates
      FROM public.bank_transactions t
      LEFT JOIN public.payments p ON p.id = t.matched_payment_id
      LEFT JOIN public.invoices i ON i.id = p.invoice_id
      LEFT JOIN public.students s ON s.id = i.student_id
      WHERE (p_status IS NULL OR t.status = p_status)
        AND (p_from IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date >= p_from)
        AND (p_to IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date <= p_to)
      ORDER BY t.received_at DESC LIMIT 500) r), '[]'::jsonb));
END $$;