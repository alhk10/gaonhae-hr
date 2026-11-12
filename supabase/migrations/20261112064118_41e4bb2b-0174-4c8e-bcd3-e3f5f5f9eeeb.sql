CREATE OR REPLACE FUNCTION public._bank_norm_payer(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(upper(regexp_replace(trim(coalesce(p,'')), '\s+', ' ', 'g')), '');
$$;

CREATE TABLE public.bank_payer_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_name text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_from_txn uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payer_name, student_id)
);
GRANT ALL ON public.bank_payer_aliases TO service_role;
ALTER TABLE public.bank_payer_aliases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bank_transaction_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_transaction_payments TO service_role;
ALTER TABLE public.bank_transaction_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.bank_transaction_payments(txn_id);

INSERT INTO public.bank_transaction_payments(txn_id, payment_id)
SELECT id, matched_payment_id FROM public.bank_transactions WHERE matched_payment_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO public.bank_payer_aliases(payer_name, student_id, created_from_txn, created_by)
SELECT DISTINCT ON (public._bank_norm_payer(t.payer_name), i.student_id) public._bank_norm_payer(t.payer_name), i.student_id, t.id, 'backfill'
FROM public.bank_transactions t JOIN public.payments p ON p.id = t.matched_payment_id JOIN public.invoices i ON i.id = p.invoice_id
WHERE i.student_id IS NOT NULL AND public._bank_norm_payer(t.payer_name) IS NOT NULL
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS public._bank_txn_candidates(uuid);
-- pending SG payments within ±1 day whose amount does not exceed the transfer
CREATE FUNCTION public._bank_txn_candidates(p_txn_id uuid)
RETURNS TABLE(payment_id uuid, invoice_id uuid, invoice_number text, student_id uuid, student_name text, branch_id text, amount numeric, payment_date date, proof_ref text, ref_match boolean, name_match boolean, shortage boolean, exact_amount boolean, payer_known boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, i.id, i.invoice_number, i.student_id,
         coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), i.customer_name), i.branch_id, p.amount, p.payment_date,
         coalesce(p.proof_scan_details->>'reference', p.reference_number),
         public._bank_ref_match(t.txn_ref, p.proof_scan_details->>'reference') OR public._bank_ref_match(t.txn_ref, p.reference_number),
         (t.payer_name IS NOT NULL AND (
           (coalesce(s.last_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(s.last_name) || '%')
           OR (coalesce(s.emergency_contact_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(s.emergency_contact_name) || '%')
           OR (coalesce(i.customer_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(i.customer_name) || '%'))),
         coalesce(p.proof_scan_status,'') = 'mismatch',
         round(p.amount*100) = round(t.amount*100),
         EXISTS (SELECT 1 FROM public.bank_payer_aliases a WHERE a.student_id = i.student_id AND a.payer_name = public._bank_norm_payer(t.payer_name))
  FROM public.bank_transactions t
  JOIN public.payments p ON round(p.amount*100) <= round(t.amount*100) AND p.amount > 0
  JOIN public.invoices i ON i.id = p.invoice_id
  JOIN public.branches b ON b.id = i.branch_id AND lower(coalesce(b.country,'')) LIKE 'sing%'
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE t.id = p_txn_id
    AND p.is_verified = false
    AND coalesce(p.verification_status,'pending') = 'pending'
    AND p.payment_method NOT IN ('cash','credit')
    AND p.payment_date BETWEEN ((t.received_at AT TIME ZONE 'Asia/Singapore')::date - 1) AND ((t.received_at AT TIME ZONE 'Asia/Singapore')::date + 1)
    AND NOT EXISTS (SELECT 1 FROM public.bank_transaction_payments l WHERE l.payment_id = p.id);
$$;
REVOKE ALL ON FUNCTION public._bank_txn_candidates(uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public._bank_apply_match(uuid,uuid,text);
CREATE FUNCTION public._bank_apply_match(p_txn_id uuid, p_payment_ids uuid[], p_by text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; v_pid uuid;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = p_txn_id;
  FOREACH v_pid IN ARRAY p_payment_ids LOOP
    INSERT INTO public.bank_transaction_payments(txn_id, payment_id) VALUES (p_txn_id, v_pid);
    UPDATE public.payments SET is_verified = true, verification_status = 'verified', verified_by = p_by, verified_at = now(),
      notes = trim(both ' ' from coalesce(notes,'') || ' [Bank ref ' || t.txn_ref || ']')
    WHERE id = v_pid;
  END LOOP;
  IF public._bank_norm_payer(t.payer_name) IS NOT NULL THEN
    INSERT INTO public.bank_payer_aliases(payer_name, student_id, created_from_txn, created_by)
    SELECT DISTINCT public._bank_norm_payer(t.payer_name), i.student_id, p_txn_id, p_by
    FROM public.payments p JOIN public.invoices i ON i.id = p.invoice_id
    WHERE p.id = ANY(p_payment_ids) AND i.student_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  UPDATE public.bank_transactions SET status = 'matched', status_reason = NULL, matched_payment_id = p_payment_ids[1], matched_by = p_by, matched_at = now() WHERE id = p_txn_id;
  INSERT INTO public.security_audit_log(action, details) VALUES ('bank_txn_matched', jsonb_build_object('txn_id', p_txn_id, 'payment_ids', to_jsonb(p_payment_ids), 'by', p_by));
END $$;
REVOKE ALL ON FUNCTION public._bank_apply_match(uuid,uuid[],text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_bank_transaction(p_txn_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; n_amt int; n_ref int; v_pid uuid; v_short boolean; n_pk int; v_pk_ids uuid[]; v_pk_sum numeric; v_pk_short boolean; n_pk_exact int; v_pk_exact uuid;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = p_txn_id FOR UPDATE;
  IF t IS NULL OR t.status = 'matched' THEN RETURN coalesce(t.status,'missing'); END IF;
  SELECT count(*) INTO n_amt FROM public._bank_txn_candidates(p_txn_id);
  SELECT count(*), min(payment_id::text)::uuid, bool_or(shortage) INTO n_ref, v_pid, v_short FROM public._bank_txn_candidates(p_txn_id) WHERE ref_match AND exact_amount;
  IF n_ref = 1 AND NOT v_short THEN
    PERFORM 1 FROM public.payments WHERE id = v_pid FOR UPDATE;
    PERFORM public._bank_apply_match(p_txn_id, ARRAY[v_pid], 'ANEXT bank email');
    RETURN 'matched';
  END IF;
  -- remembered payer (family): one exact payment, or all of the payer's pending payments summing exactly
  SELECT count(*), array_agg(payment_id ORDER BY payment_date, payment_id), sum(amount), bool_or(shortage),
         count(*) FILTER (WHERE exact_amount), min(payment_id::text) FILTER (WHERE exact_amount)
    INTO n_pk, v_pk_ids, v_pk_sum, v_pk_short, n_pk_exact, v_pk_exact
    FROM public._bank_txn_candidates(p_txn_id) WHERE payer_known;
  IF n_pk > 0 AND NOT v_pk_short THEN
    IF n_pk_exact = 1 AND n_pk = 1 THEN
      PERFORM public._bank_apply_match(p_txn_id, ARRAY[v_pk_exact::uuid], 'ANEXT bank email (known payer)');
      RETURN 'matched';
    ELSIF n_pk_exact = 0 AND round(v_pk_sum*100) = round(t.amount*100) THEN
      PERFORM 1 FROM public.payments WHERE id = ANY(v_pk_ids) FOR UPDATE;
      PERFORM public._bank_apply_match(p_txn_id, v_pk_ids, 'ANEXT bank email (known payer)');
      RETURN 'matched';
    END IF;
  END IF;
  SELECT count(*) INTO n_amt FROM public._bank_txn_candidates(p_txn_id) WHERE exact_amount OR payer_known OR name_match;
  UPDATE public.bank_transactions SET status = CASE WHEN n_amt > 0 THEN 'review' ELSE 'unmatched' END,
    status_reason = CASE WHEN n_ref > 1 THEN 'Several payments share this reference'
                         WHEN n_ref = 1 OR coalesce(v_pk_short,false) THEN 'Payment has an unresolved shortage'
                         WHEN n_pk > 0 THEN 'Known payer, but several payment combinations fit'
                         WHEN n_amt > 0 THEN 'Amount and date match but reference does not'
                         ELSE 'No pending payment with this amount and date' END
  WHERE id = p_txn_id;
  RETURN CASE WHEN n_amt > 0 THEN 'review' ELSE 'unmatched' END;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_bank_transaction(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_transaction(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.access_bank_transactions(p_password text, p_status text DEFAULT NULL, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN jsonb_build_object(
    'sync', (SELECT jsonb_build_object('last_synced_at', s.last_synced_at, 'last_error', s.last_error, 'last_count', s.last_count) FROM public.bank_sync_state s WHERE source = 'anext_email'),
    'rows', coalesce((SELECT jsonb_agg(r ORDER BY r.received_at DESC) FROM (
      SELECT t.id, t.txn_ref, t.amount, t.currency, t.received_at, t.payer_name, t.account_last4, t.method, t.status, t.status_reason,
             t.matched_by, t.matched_at,
             (SELECT coalesce(jsonb_agg(jsonb_build_object('payment_id', p.id, 'invoice_number', i.invoice_number, 'amount', p.amount,
                 'student_name', coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), i.customer_name)) ORDER BY i.invoice_number), '[]'::jsonb)
              FROM public.bank_transaction_payments l JOIN public.payments p ON p.id = l.payment_id JOIN public.invoices i ON i.id = p.invoice_id
              LEFT JOIN public.students s ON s.id = i.student_id WHERE l.txn_id = t.id) AS linked,
             CASE WHEN t.status <> 'matched' THEN (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.payer_known DESC, c.exact_amount DESC, c.payment_date), '[]'::jsonb) FROM public._bank_txn_candidates(t.id) c) END AS candidates
      FROM public.bank_transactions t
      WHERE (p_status IS NULL OR t.status = p_status)
        AND (p_from IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date >= p_from)
        AND (p_to IS NULL OR (t.received_at AT TIME ZONE 'Asia/Singapore')::date <= p_to)
      ORDER BY t.received_at DESC LIMIT 500) r), '[]'::jsonb));
END $$;

DROP FUNCTION IF EXISTS public.access_bank_match(text,uuid,uuid);
CREATE FUNCTION public.access_bank_match(p_password text, p_txn_id uuid, p_payment_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_amt numeric; v_sum numeric; n_ok int;
BEGIN
  PERFORM public._access_require_all(p_password);
  SELECT amount INTO v_amt FROM public.bank_transactions WHERE id = p_txn_id AND status <> 'matched' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction already matched'; END IF;
  IF coalesce(array_length(p_payment_ids,1),0) = 0 THEN RAISE EXCEPTION 'Select at least one payment'; END IF;
  PERFORM 1 FROM public.payments WHERE id = ANY(p_payment_ids) FOR UPDATE;
  SELECT count(*), sum(amount) INTO n_ok, v_sum FROM public._bank_txn_candidates(p_txn_id) WHERE payment_id = ANY(p_payment_ids) AND NOT shortage;
  IF n_ok <> (SELECT count(DISTINCT x) FROM unnest(p_payment_ids) x) THEN
    RAISE EXCEPTION 'One or more payments are not valid matches (date, status or shortage)';
  END IF;
  IF round(v_sum*100) <> round(v_amt*100) THEN
    RAISE EXCEPTION 'Selected payments total S$% but the transfer is S$%', to_char(v_sum,'FM999990.00'), to_char(v_amt,'FM999990.00');
  END IF;
  PERFORM public._bank_apply_match(p_txn_id, ARRAY(SELECT DISTINCT x FROM unnest(p_payment_ids) x), 'Staff (bank reconciliation)');
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_unmatch(p_password text, p_txn_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  DELETE FROM public.bank_transaction_payments WHERE txn_id = p_txn_id;
  UPDATE public.bank_transactions SET status = 'unmatched', status_reason = 'Unlinked by staff', matched_payment_id = NULL, matched_by = NULL, matched_at = NULL WHERE id = p_txn_id;
  INSERT INTO public.security_audit_log(action, details) VALUES ('bank_txn_unmatched', jsonb_build_object('txn_id', p_txn_id));
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_payers(p_password text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'payer_name', a.payer_name, 'student_id', a.student_id,
     'student_name', trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), 'created_by', a.created_by, 'created_at', a.created_at)
     ORDER BY a.payer_name, s.first_name)
   FROM public.bank_payer_aliases a JOIN public.students s ON s.id = a.student_id), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_payer_delete(p_password text, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  DELETE FROM public.bank_payer_aliases WHERE id = p_id;
  INSERT INTO public.security_audit_log(action, details) VALUES ('bank_payer_alias_deleted', jsonb_build_object('id', p_id));
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_verified_ids(p_password text, p_ids uuid[]) RETURNS uuid[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN coalesce((SELECT array_agg(payment_id) FROM public.bank_transaction_payments WHERE payment_id = ANY(p_ids)), '{}');
END $$;

GRANT EXECUTE ON FUNCTION public.access_bank_transactions(text,text,date,date), public.access_bank_match(text,uuid,uuid[]), public.access_bank_unmatch(text,uuid),
  public.access_bank_payers(text), public.access_bank_payer_delete(text,uuid), public.access_bank_verified_ids(text,uuid[]) TO anon, authenticated;
REVOKE ALL ON FUNCTION public._bank_norm_payer(text) FROM PUBLIC, anon, authenticated;