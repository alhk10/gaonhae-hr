ALTER TABLE public.bank_payer_aliases ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.bank_payer_aliases ADD COLUMN IF NOT EXISTS customer_name text;
CREATE UNIQUE INDEX IF NOT EXISTS bank_payer_aliases_payer_customer_key ON public.bank_payer_aliases(payer_name, customer_name) WHERE customer_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public._bank_name_key(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT nullif(array_to_string((regexp_split_to_array(trim(regexp_replace(upper(coalesce(p,'')), '[^A-Z0-9 ]', ' ', 'g')), '\s+'))[1:2], ' '), '');
$$;

CREATE OR REPLACE FUNCTION public._bank_external_candidates(p_txn_id uuid)
 RETURNS TABLE(invoice_id uuid, invoice_number text, customer_name text, branch_id text, balance_due numeric, issue_date date, ref_match boolean, name_match boolean, payer_known boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.invoice_number, i.customer_name, i.branch_id, i.balance_due, i.issue_date,
    (position(upper(i.invoice_number) in upper(coalesce(t.txn_ref,'') || ' ' || coalesce(t.raw_snippet,''))) > 0
      OR position(regexp_replace(i.invoice_number,'\D','','g') in regexp_replace(coalesce(t.txn_ref,'') || ' ' || coalesce(t.raw_snippet,''),'[^0-9 ]','','g')) > 0),
    (length(coalesce(public._bank_name_key(i.customer_name),'')) >= 4 AND t.payer_name IS NOT NULL
      AND position(public._bank_name_key(i.customer_name) in regexp_replace(upper(t.payer_name), '[^A-Z0-9 ]', ' ', 'g')) > 0),
    EXISTS (SELECT 1 FROM public.bank_payer_aliases a WHERE a.customer_name = upper(trim(i.customer_name)) AND a.payer_name = public._bank_norm_payer(t.payer_name))
  FROM public.bank_transactions t
  JOIN public.invoices i ON i.customer_type = 'external' AND i.status IN ('unpaid','partially_paid','sent','overdue')
       AND round(i.balance_due*100) = round(t.amount*100) AND i.balance_due > 0
       AND i.issue_date <= (t.received_at AT TIME ZONE 'Asia/Singapore')::date
  JOIN public.branches b ON b.id = i.branch_id AND lower(coalesce(b.country,'')) LIKE 'sing%'
  WHERE t.id = p_txn_id;
$$;
REVOKE ALL ON FUNCTION public._bank_external_candidates(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._bank_apply_external(p_txn_id uuid, p_invoice_id uuid, p_by text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t record; v_inv invoices%ROWTYPE; v_pid uuid;
BEGIN
  SELECT * INTO t FROM bank_transactions WHERE id = p_txn_id FOR UPDATE;
  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id AND customer_type='external' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'External invoice not found'; END IF;
  IF round(v_inv.balance_due*100) <> round(t.amount*100) THEN RAISE EXCEPTION 'Transfer amount does not equal the invoice balance'; END IF;
  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, reference_number, processed_by, created_by,
    is_verified, verification_status, verified_by, verified_at, notes)
  VALUES (p_invoice_id, 'PAY-EXT-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6), 'bank_transfer', round(t.amount,2),
    (t.received_at AT TIME ZONE 'Asia/Singapore')::date, t.txn_ref, p_by, p_by, true, 'verified', p_by, now(), '[Bank ref ' || t.txn_ref || ']')
  RETURNING id INTO v_pid;
  INSERT INTO bank_transaction_payments(txn_id, payment_id) VALUES (p_txn_id, v_pid);
  IF _bank_norm_payer(t.payer_name) IS NOT NULL AND coalesce(trim(v_inv.customer_name),'') <> '' THEN
    INSERT INTO bank_payer_aliases(payer_name, customer_name, created_from_txn, created_by)
    VALUES (_bank_norm_payer(t.payer_name), upper(trim(v_inv.customer_name)), p_txn_id, p_by)
    ON CONFLICT DO NOTHING;
  END IF;
  UPDATE bank_transactions SET status='matched', status_reason=NULL, matched_payment_id=v_pid, matched_by=p_by, matched_at=now() WHERE id=p_txn_id;
  INSERT INTO security_audit_log(action, details) VALUES ('bank_txn_matched', jsonb_build_object('txn_id', p_txn_id, 'invoice_id', p_invoice_id, 'payment_ids', jsonb_build_array(v_pid), 'by', p_by));
END $$;
REVOKE ALL ON FUNCTION public._bank_apply_external(uuid,uuid,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_bank_match_external(p_password text, p_txn_id uuid, p_invoice_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  PERFORM 1 FROM bank_transactions WHERE id = p_txn_id AND status <> 'matched';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction already matched'; END IF;
  IF NOT EXISTS (SELECT 1 FROM _bank_external_candidates(p_txn_id) c WHERE c.invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'This invoice is not a valid match (amount, date or status)';
  END IF;
  PERFORM public._bank_apply_external(p_txn_id, p_invoice_id, 'Staff (bank reconciliation)');
END $$;
GRANT EXECUTE ON FUNCTION public.access_bank_match_external(text,uuid,uuid) TO anon, authenticated;

-- Hook into automatic reconciliation: run external matching before marking review/unmatched
DO $$
DECLARE d text := pg_get_functiondef('public.reconcile_bank_transaction(uuid)'::regprocedure);
  anchor text := '  SELECT count(*) INTO n_amt FROM public._bank_txn_candidates(p_txn_id) WHERE exact_amount OR payer_known OR name_match;';
BEGIN
  IF position(anchor in d) = 0 THEN RAISE EXCEPTION 'anchor missing'; END IF;
  d := replace(d, 'v_pk_exact uuid;', 'v_pk_exact uuid; n_ext int; n_ext_all int; v_ext uuid;');
  d := replace(d, anchor, $x$  -- external customer invoices (Singapore): exact balance + reference / name / known payer, only one fits
  SELECT count(*) INTO n_ext_all FROM public._bank_external_candidates(p_txn_id);
  SELECT count(*), min(invoice_id::text)::uuid INTO n_ext, v_ext FROM public._bank_external_candidates(p_txn_id) WHERE ref_match OR name_match OR payer_known;
  IF n_ext = 1 AND NOT EXISTS (SELECT 1 FROM public._bank_txn_candidates(p_txn_id) WHERE exact_amount) THEN
    PERFORM public._bank_apply_external(p_txn_id, v_ext, 'ANEXT bank email (external invoice)');
    RETURN 'matched';
  END IF;
  IF n_ext_all > 0 THEN
    UPDATE public.bank_transactions SET status='review', status_reason = CASE WHEN n_ext > 1 THEN 'Several external invoices fit this transfer' ELSE 'Matches an external invoice amount' END WHERE id = p_txn_id;
    RETURN 'review';
  END IF;
$x$ || anchor);
  EXECUTE d;
END $$;

-- Expose external candidates in the bank list
DO $$
DECLARE d text := pg_get_functiondef('public.access_bank_transactions(text,text,date,date)'::regprocedure);
  anchor text := ' AS candidates';
BEGIN
  IF position(anchor in d) = 0 THEN RAISE EXCEPTION 'anchor missing'; END IF;
  d := replace(d, anchor, anchor || $x$,
             CASE WHEN t.status <> 'matched' THEN (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.ref_match DESC, e.name_match DESC, e.issue_date), '[]'::jsonb) FROM public._bank_external_candidates(t.id) e) END AS external_candidates$x$);
  EXECUTE d;
END $$;