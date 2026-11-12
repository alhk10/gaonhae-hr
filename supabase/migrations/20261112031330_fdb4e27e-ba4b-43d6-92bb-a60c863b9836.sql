CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'anext_email',
  gmail_message_id text NOT NULL UNIQUE,
  txn_ref text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SGD',
  received_at timestamptz NOT NULL,
  payer_name text,
  account_last4 text,
  method text,
  raw_snippet text,
  status text NOT NULL DEFAULT 'unmatched',
  status_reason text,
  matched_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_by text,
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX bank_transactions_payment_uniq ON public.bank_transactions(matched_payment_id) WHERE matched_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._bank_txn_validate() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('unmatched','matched','review') THEN RAISE EXCEPTION 'invalid status'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER bank_transactions_validate BEFORE INSERT OR UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public._bank_txn_validate();

CREATE TABLE public.bank_sync_state (
  source text PRIMARY KEY,
  last_synced_at timestamptz,
  last_error text,
  last_count int DEFAULT 0
);
GRANT ALL ON public.bank_sync_state TO service_role;
ALTER TABLE public.bank_sync_state ENABLE ROW LEVEL SECURITY;

-- digits-only reference comparison: equal, or one contains the other (>= 12 digits)
CREATE OR REPLACE FUNCTION public._bank_ref_match(a text, b text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  WITH x AS (SELECT regexp_replace(coalesce(a,''),'\D','','g') da, regexp_replace(coalesce(b,''),'\D','','g') db)
  SELECT CASE WHEN length(da) < 8 OR length(db) < 8 THEN false
              WHEN da = db THEN true
              WHEN length(least(da,db)) >= 12 AND (position(db in da) > 0 OR position(da in db) > 0) THEN true
              ELSE false END FROM x;
$$;

-- candidate pending SG payments for a transaction
CREATE OR REPLACE FUNCTION public._bank_txn_candidates(p_txn_id uuid)
RETURNS TABLE(payment_id uuid, invoice_id uuid, invoice_number text, student_name text, branch_id text, amount numeric, payment_date date, proof_ref text, ref_match boolean, name_match boolean, shortage boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, i.id, i.invoice_number,
         coalesce(nullif(trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),''), i.customer_name), i.branch_id, p.amount, p.payment_date,
         coalesce(p.proof_scan_details->>'reference', p.reference_number),
         public._bank_ref_match(t.txn_ref, p.proof_scan_details->>'reference') OR public._bank_ref_match(t.txn_ref, p.reference_number),
         (t.payer_name IS NOT NULL AND (
           (coalesce(s.last_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(s.last_name) || '%')
           OR (coalesce(s.emergency_contact_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(s.emergency_contact_name) || '%')
           OR (coalesce(i.customer_name,'') <> '' AND upper(t.payer_name) LIKE '%' || upper(i.customer_name) || '%'))),
         coalesce(p.proof_scan_status,'') = 'mismatch'
  FROM public.bank_transactions t
  JOIN public.payments p ON round(p.amount*100) = round(t.amount*100)
  JOIN public.invoices i ON i.id = p.invoice_id
  JOIN public.branches b ON b.id = i.branch_id AND lower(coalesce(b.country,'')) LIKE 'sing%'
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE t.id = p_txn_id
    AND p.is_verified = false
    AND coalesce(p.verification_status,'pending') = 'pending'
    AND p.payment_method NOT IN ('cash','credit')
    AND p.payment_date BETWEEN ((t.received_at AT TIME ZONE 'Asia/Singapore')::date - 1) AND ((t.received_at AT TIME ZONE 'Asia/Singapore')::date + 1)
    AND NOT EXISTS (SELECT 1 FROM public.bank_transactions o WHERE o.matched_payment_id = p.id);
$$;
REVOKE ALL ON FUNCTION public._bank_txn_candidates(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._bank_apply_match(p_txn_id uuid, p_payment_id uuid, p_by text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.payments SET is_verified = true, verification_status = 'verified', verified_by = p_by, verified_at = now(),
    notes = trim(both ' ' from coalesce(notes,'') || ' [Bank ref ' || (SELECT txn_ref FROM public.bank_transactions WHERE id = p_txn_id) || ']')
  WHERE id = p_payment_id;
  UPDATE public.bank_transactions SET status = 'matched', status_reason = NULL, matched_payment_id = p_payment_id, matched_by = p_by, matched_at = now() WHERE id = p_txn_id;
  INSERT INTO public.security_audit_log(action, details) VALUES ('bank_txn_matched', jsonb_build_object('txn_id', p_txn_id, 'payment_id', p_payment_id, 'by', p_by));
END $$;
REVOKE ALL ON FUNCTION public._bank_apply_match(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_bank_transaction(p_txn_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; n_amt int; n_ref int; v_pid uuid; v_short boolean;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = p_txn_id FOR UPDATE;
  IF t IS NULL OR t.status = 'matched' THEN RETURN coalesce(t.status,'missing'); END IF;
  SELECT count(*) INTO n_amt FROM public._bank_txn_candidates(p_txn_id);
  SELECT count(*), min(payment_id::text)::uuid, bool_or(shortage) INTO n_ref, v_pid, v_short FROM public._bank_txn_candidates(p_txn_id) WHERE ref_match;
  IF n_ref = 1 AND NOT v_short THEN
    PERFORM 1 FROM public.payments WHERE id = v_pid FOR UPDATE;
    PERFORM public._bank_apply_match(p_txn_id, v_pid, 'ANEXT bank email');
    RETURN 'matched';
  END IF;
  UPDATE public.bank_transactions SET status = CASE WHEN n_amt > 0 THEN 'review' ELSE 'unmatched' END,
    status_reason = CASE WHEN n_ref > 1 THEN 'Several payments share this reference'
                         WHEN n_ref = 1 THEN 'Payment has an unresolved shortage'
                         WHEN n_amt > 0 THEN 'Amount and date match but reference does not'
                         ELSE 'No pending payment with this amount and date' END
  WHERE id = p_txn_id;
  RETURN CASE WHEN n_amt > 0 THEN 'review' ELSE 'unmatched' END;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_bank_transaction(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_transaction(uuid) TO service_role;

-- Staff RPCs (all-branch password)
CREATE OR REPLACE FUNCTION public.access_bank_transactions(p_password text, p_status text DEFAULT NULL, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  RETURN jsonb_build_object(
    'sync', (SELECT to_jsonb(s) FROM public.bank_sync_state s WHERE source = 'anext_email'),
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
      LIMIT 500) r), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_match(p_password text, p_txn_id uuid, p_payment_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  PERFORM 1 FROM public.bank_transactions WHERE id = p_txn_id AND status <> 'matched' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction already matched'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public._bank_txn_candidates(p_txn_id) WHERE payment_id = p_payment_id) THEN
    RAISE EXCEPTION 'That payment is not a valid match (amount, date or status differs)';
  END IF;
  PERFORM public._bank_apply_match(p_txn_id, p_payment_id, 'Staff (bank reconciliation)');
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_unmatch(p_password text, p_txn_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  UPDATE public.bank_transactions SET status = 'unmatched', status_reason = 'Unlinked by staff', matched_payment_id = NULL, matched_by = NULL, matched_at = NULL WHERE id = p_txn_id;
  INSERT INTO public.security_audit_log(action, details) VALUES ('bank_txn_unmatched', jsonb_build_object('txn_id', p_txn_id));
END $$;

CREATE OR REPLACE FUNCTION public.access_bank_check(p_password text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN PERFORM public._access_require_all(p_password); RETURN true; END $$;

GRANT EXECUTE ON FUNCTION public.access_bank_transactions(text,text,date,date), public.access_bank_match(text,uuid,uuid), public.access_bank_unmatch(text,uuid), public.access_bank_check(text) TO anon, authenticated;