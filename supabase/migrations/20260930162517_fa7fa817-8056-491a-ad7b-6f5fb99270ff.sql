ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS extra_proofs jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.public_chat_payment_submissions ADD COLUMN IF NOT EXISTS extra_proofs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.invoice_action_requests DROP CONSTRAINT invoice_action_requests_action_type_check;
ALTER TABLE public.invoice_action_requests ADD CONSTRAINT invoice_action_requests_action_type_check
  CHECK (action_type = ANY (ARRAY['adjustment','cancellation','item_refund','credit_refund','overpayment_credit']));

DROP FUNCTION IF EXISTS public.get_public_school_fees_list(text, text);
CREATE FUNCTION public.get_public_school_fees_list(p_branch_id text DEFAULT NULL, p_status text DEFAULT NULL)
 RETURNS TABLE(id uuid, created_at timestamptz, student_id uuid, student_name text, contact_name text, contact_email text, contact_dob text, reference_number text, branch_id text, branch_name text, category text, items jsonb, amount numeric, payment_method text, proof_url text, status text, invoice_id uuid, invoice_number text, invoice_status text, payment_id uuid, payment_number text, payment_verification_status text, source text, scan_amount numeric, extra_proofs jsonb, paid_total numeric, overpayment_request_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT x.*,
    CASE WHEN x.scan_amount IS NULL AND jsonb_array_length(x.extra_proofs)=0 THEN NULL
      ELSE COALESCE(x.scan_amount,0) + COALESCE((SELECT sum(NULLIF(e->>'amount','')::numeric) FROM jsonb_array_elements(x.extra_proofs) e),0) END,
    (SELECT r.status FROM public.invoice_action_requests r WHERE r.action_type='overpayment_credit'
       AND r.request_data->>'row_id' = x.id::text AND r.status IN ('pending','approved') ORDER BY r.created_at DESC LIMIT 1)
  FROM (
  SELECT s.id, s.created_at, s.matched_student_id,
    COALESCE(NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
             NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),'')),
    NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),''),
    s.items->0->>'contact_email', s.items->0->>'contact_dob', s.reference_number, s.branch_id, b.name, s.category, s.items, s.amount,
    s.payment_method, s.proof_url, s.status, inv.id, inv.invoice_number, inv.status, pay.id, pay.payment_number, pay.verification_status,
    'submission'::text, s.proof_scan_amount, s.extra_proofs
  FROM public.public_chat_payment_submissions s
  LEFT JOIN public.students st ON st.id = s.matched_student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN LATERAL (SELECT i.* FROM public.invoices i WHERE i.id = public._resolve_chat_submission_invoice(s)) inv ON true
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = inv.id ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE s.category = 'a416f120-4ec2-4826-8d37-375db3e002bc'
  UNION ALL
  SELECT i.id, i.created_at, i.student_id,
    NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
    NULL, st.email, st.date_of_birth::text, COALESCE(pay.payment_number, i.invoice_number), i.branch_id, b.name, NULL,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id', ii.product_id, 'product_name', split_part(ii.description,' — ',1),
        'term_name', ii.metadata->>'term_name', 'qty', ii.quantity, 'unit_price', ii.unit_price))
      FROM public.invoice_items ii WHERE ii.invoice_id = i.id), '[]'::jsonb),
    i.total_amount, pay.payment_method, pay.proof_of_payment_url,
    CASE WHEN i.status='cancelled' THEN 'cancelled'
         WHEN pay.verification_status='rejected' THEN 'rejected'
         WHEN pay.verification_status='verified' OR i.status='verified' THEN 'verified'
         ELSE 'pending_verification' END,
    i.id, i.invoice_number, i.status, pay.id, pay.payment_number, pay.verification_status, 'hello'::text,
    pay.proof_scan_amount, COALESCE(pay.extra_proofs,'[]'::jsonb)
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = i.id AND p.payment_method <> 'credit' ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE i.created_by = 'public_hello_chat'
  ) x(id, created_at, student_id, student_name, contact_name, contact_email, contact_dob, reference_number, branch_id, branch_name, category, items, amount, payment_method, proof_url, status, invoice_id, invoice_number, invoice_status, payment_id, payment_number, payment_verification_status, source, scan_amount, extra_proofs)
  WHERE (p_branch_id IS NULL OR x.branch_id = p_branch_id)
    AND (p_status IS NULL OR x.status = p_status)
  ORDER BY x.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_school_fees_list(text,text) TO anon, authenticated;

-- Second proof
CREATE OR REPLACE FUNCTION public.admin_add_school_fees_extra_proof(p_id uuid, p_source text, p_url text, p_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_entry jsonb := jsonb_build_object('url', p_url, 'amount', p_amount, 'added_at', now());
BEGIN
  IF p_url IS NULL OR btrim(p_url)='' THEN RAISE EXCEPTION 'Proof required'; END IF;
  IF p_source = 'hello' THEN
    UPDATE public.payments SET extra_proofs = COALESCE(extra_proofs,'[]'::jsonb) || v_entry
     WHERE id = (SELECT p.id FROM public.payments p WHERE p.invoice_id = p_id AND p.payment_method <> 'credit' ORDER BY p.created_at DESC LIMIT 1);
  ELSE
    UPDATE public.public_chat_payment_submissions SET extra_proofs = COALESCE(extra_proofs,'[]'::jsonb) || v_entry WHERE id = p_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_add_school_fees_extra_proof(uuid,text,text,numeric) TO anon, authenticated;

-- Inline edit
CREATE OR REPLACE FUNCTION public.admin_update_school_fees_row(p_id uuid, p_source text, p_amount numeric, p_payment_method text, p_email text, p_reason text, p_actor text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_verified boolean; v_name text; v_ref text; v_old numeric; v_pay uuid;
BEGIN
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('paynow','bank_transfer','cash') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_amount IS NOT NULL AND p_amount < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT r.status='verified', r.student_name, r.reference_number, r.amount, r.payment_id
    INTO v_verified, v_name, v_ref, v_old, v_pay
    FROM public.get_public_school_fees_list(NULL,NULL) r WHERE r.id = p_id AND r.source = p_source;
  IF v_name IS NULL AND v_ref IS NULL AND v_old IS NULL THEN RAISE EXCEPTION 'Row not found'; END IF;

  IF v_verified THEN
    INSERT INTO public.submission_edit_requests(source, record_id, student_name, reference_number, amount, proposed_changes, reason, requested_by, status)
    VALUES (CASE WHEN p_source='hello' THEN 'school_fees_hello' ELSE 'school_fees' END, p_id, v_name, v_ref, v_old,
      jsonb_strip_nulls(jsonb_build_object('amount', p_amount, 'payment_method', p_payment_method, 'email', NULLIF(btrim(COALESCE(p_email,'')),''))),
      COALESCE(p_reason,'Staff edit from /access'), COALESCE(p_actor,'access'), 'pending');
    RETURN 'requested';
  END IF;

  IF p_source = 'hello' THEN
    IF v_pay IS NOT NULL THEN
      UPDATE public.payments SET amount = COALESCE(p_amount, amount), payment_method = COALESCE(p_payment_method, payment_method) WHERE id = v_pay;
    END IF;
  ELSE
    UPDATE public.public_chat_payment_submissions
       SET amount = COALESCE(p_amount, amount), payment_method = COALESCE(p_payment_method, payment_method),
           items = CASE WHEN NULLIF(btrim(COALESCE(p_email,'')),'') IS NOT NULL AND jsonb_array_length(items) > 0
                        THEN jsonb_set(items, '{0,contact_email}', to_jsonb(lower(btrim(p_email)))) ELSE items END
     WHERE id = p_id;
  END IF;
  RETURN 'saved';
END $$;
GRANT EXECUTE ON FUNCTION public.admin_update_school_fees_row(uuid,text,numeric,text,text,text,text) TO anon, authenticated;

-- Extend correction approval for school fee fields
CREATE OR REPLACE FUNCTION public.approve_submission_edit_request(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_req public.submission_edit_requests%ROWTYPE; v_amount numeric; v_email text; v_phone text; v_method text;
BEGIN
  SELECT * INTO v_req FROM public.submission_edit_requests WHERE id = p_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
  v_amount := NULLIF(v_req.proposed_changes->>'amount', '')::numeric;
  v_email := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'email', '')), '');
  v_phone := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'phone', '')), '');
  v_method := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'payment_method', '')), '');

  IF v_req.source = 'grading' THEN
    UPDATE public.grading_payment_submissions SET amount = coalesce(v_amount, amount), email = coalesce(v_email, email), updated_at = now() WHERE id = v_req.record_id;
  ELSIF v_req.source = 'competition' THEN
    UPDATE public.competition_payment_submissions SET amount = coalesce(v_amount, amount), email = coalesce(v_email, email), updated_at = now() WHERE id = v_req.record_id;
  ELSIF v_req.source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions SET amount = coalesce(v_amount, amount), email = coalesce(v_email, email), updated_at = now() WHERE id = v_req.record_id;
  ELSIF v_req.source = 'guards' THEN
    UPDATE public.guards_purchases SET total = coalesce(v_amount, total), email = coalesce(v_email, email), phone = coalesce(v_phone, phone), updated_at = now() WHERE id = v_req.record_id;
  ELSIF v_req.source = 'school_fees' THEN
    UPDATE public.public_chat_payment_submissions
       SET amount = coalesce(v_amount, amount), payment_method = coalesce(v_method, payment_method),
           items = CASE WHEN v_email IS NOT NULL AND jsonb_array_length(items) > 0 THEN jsonb_set(items, '{0,contact_email}', to_jsonb(lower(v_email))) ELSE items END
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'school_fees_hello' THEN
    UPDATE public.payments SET amount = coalesce(v_amount, amount), payment_method = coalesce(v_method, payment_method)
     WHERE id = (SELECT p.id FROM public.payments p WHERE p.invoice_id = v_req.record_id AND p.payment_method <> 'credit' ORDER BY p.created_at DESC LIMIT 1);
  END IF;
  UPDATE public.submission_edit_requests SET status = 'approved', reviewed_at = now(), reviewed_by = 'superadmin', updated_at = now() WHERE id = p_id;
END;
$function$;

-- Overpayment to credit
CREATE OR REPLACE FUNCTION public.request_overpayment_credit(p_id uuid, p_source text, p_amount numeric, p_reason text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT * INTO r FROM public.get_public_school_fees_list(NULL,NULL) x WHERE x.id = p_id AND x.source = p_source;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Row not found'; END IF;
  IF r.student_id IS NULL THEN RAISE EXCEPTION 'Match this payment to a student first'; END IF;
  IF r.overpayment_request_status IS NOT NULL THEN RAISE EXCEPTION 'A credit request for this payment is already %', r.overpayment_request_status; END IF;
  INSERT INTO public.invoice_action_requests(invoice_id, action_type, request_data, requested_by, requested_by_email, invoice_number, student_name, status)
  VALUES (r.invoice_id, 'overpayment_credit',
    jsonb_build_object('row_id', p_id, 'source', p_source, 'student_id', r.student_id, 'amount', round(p_amount,2),
      'reason', p_reason, 'payment_id', r.payment_id, 'invoice_amount', r.amount, 'paid_total', r.paid_total),
    NULL, COALESCE(p_actor,'access'), r.invoice_number, r.student_name, 'pending');
END $$;
GRANT EXECUTE ON FUNCTION public.request_overpayment_credit(uuid,text,numeric,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_overpayment_credit(p_request_id uuid, p_approve boolean, p_reviewer text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v public.invoice_action_requests%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.invoice_action_requests WHERE id = p_request_id AND action_type='overpayment_credit' FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v.status <> 'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
  IF p_approve THEN
    IF NOT EXISTS (SELECT 1 FROM public.student_credits WHERE type='overpayment' AND reference_id = 'overpay:'||(v.request_data->>'row_id')) THEN
      INSERT INTO public.student_credits(student_id, amount, type, reference_id, description, created_by)
      VALUES ((v.request_data->>'student_id')::uuid, (v.request_data->>'amount')::numeric, 'overpayment',
        'overpay:'||(v.request_data->>'row_id'),
        'Overpayment on ' || COALESCE('Invoice #'||v.invoice_number, 'school fee payment'), p_reviewer);
    END IF;
  END IF;
  UPDATE public.invoice_action_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = p_reviewer, reviewed_at = now(), rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END
   WHERE id = p_request_id;
END $$;
GRANT EXECUTE ON FUNCTION public.review_overpayment_credit(uuid,boolean,text,text) TO authenticated;