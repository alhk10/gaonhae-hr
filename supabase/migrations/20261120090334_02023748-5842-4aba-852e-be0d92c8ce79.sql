CREATE OR REPLACE FUNCTION public._bank_txn_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('unmatched','matched','review','partial') THEN RAISE EXCEPTION 'invalid status'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._bank_txn_allocated(p_txn_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(sum(p.amount),0) FROM bank_transaction_payments l JOIN payments p ON p.id=l.payment_id WHERE l.txn_id=p_txn_id;
$$;
REVOKE ALL ON FUNCTION public._bank_txn_allocated(uuid) FROM PUBLIC, anon, authenticated;

-- Manual search of open student payments and external invoices (Singapore branches)
CREATE OR REPLACE FUNCTION public.access_bank_manual_search(p_password text, p_txn_id uuid, p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL, p_amount_max numeric DEFAULT NULL, p_text text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE t record; q text := nullif(upper(trim(coalesce(p_text,''))),'');
BEGIN
  PERFORM _access_require_all(p_password);
  SELECT * INTO t FROM bank_transactions WHERE id=p_txn_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  RETURN coalesce((SELECT jsonb_agg(r ORDER BY r.diff_min) FROM (
    SELECT * FROM (
      SELECT 'payment' kind, p.id payment_id, i.id invoice_id, i.invoice_number,
        coalesce(nullif(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')),''), i.customer_name) name,
        b.name branch_name, p.amount, p.created_at at,
        abs(extract(epoch from (p.created_at - t.received_at)))/60 diff_min,
        coalesce(p.proof_scan_status,'')='mismatch' shortage,
        EXISTS (SELECT 1 FROM bank_payer_aliases a WHERE a.student_id=i.student_id AND a.payer_name=_bank_norm_payer(t.payer_name)) payer_known
      FROM payments p JOIN invoices i ON i.id=p.invoice_id
      JOIN branches b ON b.id=i.branch_id AND lower(coalesce(b.country,'')) LIKE 'sing%'
      LEFT JOIN students s ON s.id=i.student_id
      WHERE p.is_verified=false AND coalesce(p.verification_status,'pending')='pending' AND p.amount>0
        AND p.payment_method NOT IN ('cash','credit')
        AND NOT EXISTS (SELECT 1 FROM bank_transaction_payments l WHERE l.payment_id=p.id)
        AND (p_from IS NULL OR p.payment_date >= p_from) AND (p_to IS NULL OR p.payment_date <= p_to)
        AND (p_amount_min IS NULL OR p.amount >= p_amount_min) AND (p_amount_max IS NULL OR p.amount <= p_amount_max)
        AND (q IS NULL OR upper(i.invoice_number) LIKE '%'||q||'%' OR upper(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) LIKE '%'||q||'%' OR upper(coalesce(i.customer_name,'')) LIKE '%'||q||'%')
      UNION ALL
      SELECT 'external', NULL, i.id, i.invoice_number, i.customer_name, b.name, i.balance_due, i.created_at,
        abs(extract(epoch from (i.created_at - t.received_at)))/60, false,
        EXISTS (SELECT 1 FROM bank_payer_aliases a WHERE a.customer_name=upper(trim(i.customer_name)) AND a.payer_name=_bank_norm_payer(t.payer_name))
      FROM invoices i JOIN branches b ON b.id=i.branch_id AND lower(coalesce(b.country,'')) LIKE 'sing%'
      WHERE i.customer_type='external' AND i.balance_due>0 AND i.status NOT IN ('cancelled','draft','refunded')
        AND (p_from IS NULL OR i.issue_date >= p_from) AND (p_to IS NULL OR i.issue_date <= p_to)
        AND (p_amount_min IS NULL OR i.balance_due >= p_amount_min) AND (p_amount_max IS NULL OR i.balance_due <= p_amount_max)
        AND (q IS NULL OR upper(i.invoice_number) LIKE '%'||q||'%' OR upper(coalesce(i.customer_name,'')) LIKE '%'||q||'%')
    ) x ORDER BY payer_known DESC, diff_min LIMIT 50) r), '[]'::jsonb);
END $$;

-- Allocate one transfer across several payments / external invoices (up to the transfer amount)
CREATE OR REPLACE FUNCTION public.access_bank_allocate(p_password text, p_txn_id uuid, p_allocations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE t record; a jsonb; v_inv invoices%ROWTYPE; v_p payments%ROWTYPE; v_new numeric := 0; v_prev numeric; v_amt numeric; v_pid uuid;
  v_by text := 'Staff (manual bank reconciliation)'; v_pids uuid[] := '{}'; v_total numeric;
BEGIN
  PERFORM _access_require_all(p_password);
  SELECT * INTO t FROM bank_transactions WHERE id=p_txn_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF t.status='matched' THEN RAISE EXCEPTION 'Transaction already fully matched'; END IF;
  IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)=0 THEN RAISE EXCEPTION 'Select at least one item'; END IF;
  v_prev := _bank_txn_allocated(p_txn_id);
  FOR a IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    IF a ? 'payment_id' THEN
      SELECT * INTO v_p FROM payments WHERE id=(a->>'payment_id')::uuid FOR UPDATE;
      IF NOT FOUND OR v_p.is_verified OR coalesce(v_p.verification_status,'pending')<>'pending' THEN RAISE EXCEPTION 'A selected payment is no longer pending'; END IF;
      IF coalesce(v_p.proof_scan_status,'')='mismatch' THEN RAISE EXCEPTION 'Payment % has an unresolved shortage', v_p.payment_number; END IF;
      IF EXISTS (SELECT 1 FROM bank_transaction_payments WHERE payment_id=v_p.id) OR v_p.id = ANY(v_pids) THEN RAISE EXCEPTION 'A payment is already linked to a transfer'; END IF;
      v_new := v_new + v_p.amount; v_pids := v_pids || v_p.id;
    ELSE
      v_amt := round((a->>'amount')::numeric, 2);
      SELECT * INTO v_inv FROM invoices WHERE id=(a->>'invoice_id')::uuid AND customer_type='external' FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'External invoice not found'; END IF;
      IF NOT (v_amt > 0) OR round(v_amt*100) > round(v_inv.balance_due*100) THEN RAISE EXCEPTION 'Amount for % must be above 0 and at most its balance', v_inv.invoice_number; END IF;
      v_new := v_new + v_amt;
    END IF;
  END LOOP;
  IF round((v_prev + v_new)*100) > round(t.amount*100) THEN
    RAISE EXCEPTION 'Allocated S$% exceeds the transfer S$%', to_char(v_prev+v_new,'FM999990.00'), to_char(t.amount,'FM999990.00');
  END IF;
  -- student payments
  IF array_length(v_pids,1) > 0 THEN
    FOREACH v_pid IN ARRAY v_pids LOOP
      INSERT INTO bank_transaction_payments(txn_id, payment_id) VALUES (p_txn_id, v_pid);
      UPDATE payments SET is_verified=true, verification_status='verified', verified_by=v_by, verified_at=now(),
        notes=trim(both ' ' from coalesce(notes,'')||' [Bank ref '||t.txn_ref||']') WHERE id=v_pid;
    END LOOP;
    IF _bank_norm_payer(t.payer_name) IS NOT NULL THEN
      INSERT INTO bank_payer_aliases(payer_name, student_id, created_from_txn, created_by)
      SELECT DISTINCT _bank_norm_payer(t.payer_name), i.student_id, p_txn_id, v_by
      FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.id=ANY(v_pids) AND i.student_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  -- external invoices
  FOR a IN SELECT * FROM jsonb_array_elements(p_allocations) WHERE NOT (value ? 'payment_id') LOOP
    SELECT * INTO v_inv FROM invoices WHERE id=(a->>'invoice_id')::uuid;
    INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, reference_number, processed_by, created_by,
      is_verified, verification_status, verified_by, verified_at, notes)
    VALUES (v_inv.id, 'PAY-EXT-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,6), 'bank_transfer', round((a->>'amount')::numeric,2),
      (t.received_at AT TIME ZONE 'Asia/Singapore')::date, t.txn_ref, v_by, v_by, true, 'verified', v_by, now(), '[Bank ref '||t.txn_ref||']')
    RETURNING id INTO v_pid;
    INSERT INTO bank_transaction_payments(txn_id, payment_id) VALUES (p_txn_id, v_pid);
    v_pids := v_pids || v_pid;
    IF _bank_norm_payer(t.payer_name) IS NOT NULL AND coalesce(trim(v_inv.customer_name),'')<>'' THEN
      INSERT INTO bank_payer_aliases(payer_name, customer_name, created_from_txn, created_by)
      VALUES (_bank_norm_payer(t.payer_name), upper(trim(v_inv.customer_name)), p_txn_id, v_by) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  v_total := v_prev + v_new;
  UPDATE bank_transactions SET
    status = CASE WHEN round(v_total*100)=round(t.amount*100) THEN 'matched' ELSE 'partial' END,
    status_reason = CASE WHEN round(v_total*100)=round(t.amount*100) THEN NULL ELSE 'S$'||to_char(t.amount-v_total,'FM999990.00')||' not yet allocated' END,
    matched_payment_id = coalesce(matched_payment_id, v_pids[1]), matched_by=v_by, matched_at=now()
  WHERE id=p_txn_id;
  INSERT INTO security_audit_log(user_email, action, details) VALUES (v_by, 'bank_txn_allocated', jsonb_build_object('txn_id', p_txn_id, 'payment_ids', to_jsonb(v_pids), 'allocated', v_total));
  RETURN jsonb_build_object('allocated', v_total, 'remaining', t.amount - v_total);
END $$;

REVOKE ALL ON FUNCTION public.access_bank_manual_search(text,uuid,date,date,numeric,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.access_bank_allocate(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.access_bank_manual_search(text,uuid,date,date,numeric,numeric,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_bank_allocate(text,uuid,jsonb) TO anon, authenticated;

-- Transactions list: include allocated total and remainder
CREATE OR REPLACE FUNCTION public.access_bank_transactions(p_password text, p_status text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN jsonb_build_object(
    'sync', (SELECT jsonb_build_object('last_synced_at', s.last_synced_at, 'last_error', s.last_error, 'last_count', s.last_count) FROM public.bank_sync_state s WHERE source = 'anext_email'),
    'rows', coalesce((SELECT jsonb_agg(r ORDER BY r.received_at DESC) FROM (
      SELECT t.id, t.txn_ref, t.amount, t.currency, t.received_at, t.payer_name, t.account_last4, t.method, t.status, t.status_reason,
             t.matched_by, t.matched_at, public._bank_txn_allocated(t.id) AS allocated,
             (SELECT coalesce(jsonb_agg(jsonb_build_object('payment_id', p.id, 'invoice_number', i.invoice_number, 'amount', p.amount,
                 'student_name', coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), i.customer_name)) ORDER BY i.invoice_number), '[]'::jsonb)
              FROM public.bank_transaction_payments l JOIN public.payments p ON p.id = l.payment_id JOIN public.invoices i ON i.id = p.invoice_id
              LEFT JOIN public.students s ON s.id = i.student_id WHERE l.txn_id = t.id) AS linked,
             CASE WHEN t.status <> 'matched' THEN (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.payer_known DESC, c.exact_amount DESC, c.payment_date), '[]'::jsonb) FROM public._bank_txn_candidates(t.id) c) END AS candidates,
             CASE WHEN t.status <> 'matched' THEN (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.ref_match DESC, e.name_match DESC, e.issue_date), '[]'::jsonb) FROM public._bank_external_candidates(t.id) e) END AS external_candidates
      FROM public.bank_transactions t
      WHERE (p_status IS NULL OR t.status = p_status)
        AND (p_from IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date >= p_from)
        AND (p_to IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date <= p_to)
      ORDER BY t.received_at DESC LIMIT 500) r), '[]'::jsonb));
END $function$;