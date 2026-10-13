CREATE OR REPLACE FUNCTION public.pay_public_chat_invoice(
  p_session_id uuid,
  p_student_id uuid,
  p_invoice_ids uuid[],
  p_payment_method text,
  p_proof_url text,
  p_client_ref text
) RETURNS TABLE(payment_count integer, total_amount numeric, credit_used numeric, cash_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_total numeric := 0;
  v_available_credit numeric := 0;
  v_credit_used numeric := 0;
  v_remaining numeric := 0;
  v_credit_alloc numeric;
  v_cash_alloc numeric;
  v_payment_number text;
  v_count integer := 0;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  IF p_invoice_ids IS NULL OR array_length(p_invoice_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No invoices selected';
  END IF;

  -- Idempotency: a retry with the same client_ref returns the original result.
  -- Each inserted payment row stores p_client_ref with a per-row suffix, so match by prefix.
  IF p_client_ref IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.payments p WHERE p.client_ref LIKE p_client_ref || '%') THEN
    RETURN QUERY
      SELECT COUNT(*)::integer,
             COALESCE(SUM(p.amount), 0)::numeric,
             COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'credit'), 0)::numeric,
             COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method <> 'credit'), 0)::numeric
      FROM public.payments p
      WHERE p.client_ref LIKE p_client_ref || '%';
    RETURN;
  END IF;

  -- Lock the invoices and validate them. Every invoice must belong to this student.
  FOR v_invoice IN
    SELECT inv.id, inv.invoice_number, inv.status, inv.balance_due
    FROM public.invoices inv
    WHERE inv.id = ANY (p_invoice_ids)
      AND inv.student_id = p_student_id
    ORDER BY inv.issue_date ASC, inv.created_at ASC
    FOR UPDATE
  LOOP
    IF v_invoice.status IN ('cancelled', 'refunded') THEN
      RAISE EXCEPTION 'Invoice % cannot be paid', v_invoice.invoice_number;
    END IF;
    IF COALESCE(v_invoice.balance_due, 0) <= 0 THEN
      RAISE EXCEPTION 'Invoice % has no outstanding balance', v_invoice.invoice_number;
    END IF;
    v_total := v_total + v_invoice.balance_due;
    v_count := v_count + 1;
  END LOOP;

  IF v_count <> array_length(p_invoice_ids, 1) THEN
    RAISE EXCEPTION 'One or more invoices were not found';
  END IF;

  -- Lock this student's credit ledger so concurrent payments cannot spend the same credit.
  PERFORM pg_advisory_xact_lock(hashtextextended('student_credit:' || p_student_id::text, 0));

  v_available_credit := GREATEST(COALESCE(public.get_student_available_credit(p_student_id), 0), 0);
  v_credit_used := round(LEAST(v_available_credit, v_total), 2);
  v_remaining := round(v_total - v_credit_used, 2);

  IF v_remaining > 0 THEN
    IF p_payment_method NOT IN ('paynow', 'bank_transfer') THEN
      RAISE EXCEPTION 'Invalid payment method';
    END IF;
    IF p_proof_url IS NULL OR btrim(p_proof_url) = '' THEN
      RAISE EXCEPTION 'Proof of payment is required';
    END IF;
  END IF;

  -- Allocate credit then cash across the invoices, oldest first.
  FOR v_invoice IN
    SELECT inv.id, inv.invoice_number, inv.balance_due
    FROM public.invoices inv
    WHERE inv.id = ANY (p_invoice_ids)
      AND inv.student_id = p_student_id
    ORDER BY inv.issue_date ASC, inv.created_at ASC
  LOOP
    v_credit_alloc := round(LEAST(v_credit_used, v_invoice.balance_due), 2);
    v_credit_used := v_credit_used - v_credit_alloc;
    v_cash_alloc := round(v_invoice.balance_due - v_credit_alloc, 2);

    IF v_credit_alloc > 0 THEN
      INSERT INTO public.student_credits (student_id, amount, type, reference_id, description, created_by)
      VALUES (
        p_student_id,
        -v_credit_alloc,
        'credit_hold',
        v_invoice.id::text,
        format('Credit on hold for Invoice #%s (pending verification)', v_invoice.invoice_number),
        'public_hello_chat'
      );

      v_payment_number := public.generate_payment_number();
      INSERT INTO public.payments (
        invoice_id, payment_number, payment_method, amount, payment_date,
        reference_number, proof_of_payment_url, notes, processed_by,
        is_verified, verification_status, created_by, updated_by, client_ref
      ) VALUES (
        v_invoice.id,
        v_payment_number,
        'credit',
        v_credit_alloc,
        CURRENT_DATE,
        v_invoice.invoice_number,
        NULL,
        format('Student credit applied (on hold until verification); session=%s', p_session_id),
        'public_hello_chat',
        false,
        'pending_verification',
        'public_hello_chat',
        'public_hello_chat',
        CASE WHEN p_client_ref IS NULL THEN NULL ELSE p_client_ref || ':cr:' || v_invoice.id::text END
      );
    END IF;

    IF v_cash_alloc > 0 THEN
      v_payment_number := public.generate_payment_number();
      INSERT INTO public.payments (
        invoice_id, payment_number, payment_method, amount, payment_date,
        reference_number, proof_of_payment_url, notes, processed_by,
        is_verified, verification_status, created_by, updated_by, client_ref
      ) VALUES (
        v_invoice.id,
        v_payment_number,
        p_payment_method,
        v_cash_alloc,
        CURRENT_DATE,
        v_invoice.invoice_number,
        p_proof_url,
        format('Public hello chat invoice payment pending verification; session=%s', p_session_id),
        'public_hello_chat',
        false,
        'pending_verification',
        'public_hello_chat',
        'public_hello_chat',
        CASE WHEN p_client_ref IS NULL THEN NULL ELSE p_client_ref || ':cash:' || v_invoice.id::text END
      );
    END IF;
  END LOOP;

  -- Invoice totals/status are recalculated by the payments sync trigger.
  RETURN QUERY SELECT v_count, v_total, round(LEAST(v_available_credit, v_total), 2), v_remaining;
END;
$function$;

REVOKE ALL ON FUNCTION public.pay_public_chat_invoice(uuid, uuid, uuid[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_public_chat_invoice(uuid, uuid, uuid[], text, text, text) TO anon, authenticated, service_role;