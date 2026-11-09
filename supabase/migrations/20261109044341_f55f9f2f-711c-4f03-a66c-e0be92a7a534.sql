CREATE OR REPLACE FUNCTION public.admin_verify_school_fees_submission(p_id uuid, p_verified_by text DEFAULT 'admin'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF FOUND THEN
    v_invoice_id := public._resolve_chat_submission_invoice(sub);
    UPDATE public.public_chat_payment_submissions
       SET status = 'verified',
           notes = COALESCE(notes, '') || format(E'\nVerified by %s at %s', p_verified_by, now())
     WHERE id = p_id;
  ELSIF EXISTS (SELECT 1 FROM public.invoices WHERE id = p_id) THEN
    v_invoice_id := p_id;  -- invoice-backed School fees row
  ELSE
    RAISE EXCEPTION 'School fees submission % not found', p_id;
  END IF;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.payments
       SET is_verified = true, verification_status = 'verified', verified_at = now(), updated_at = now(), updated_by = p_verified_by
     WHERE invoice_id = v_invoice_id AND coalesce(verification_status,'') <> 'rejected';

    UPDATE public.invoices SET status = 'verified', updated_at = now(), updated_by = p_verified_by WHERE id = v_invoice_id;

    PERFORM public.consume_credit_hold(v_invoice_id, p_verified_by);

    UPDATE public.lesson_bookings SET status = 'booked', approved_by = p_verified_by, approved_at = now()
     WHERE invoice_id = v_invoice_id AND status = 'requested';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_school_fees_submission(p_id uuid, p_reason text DEFAULT NULL::text, p_reviewed_by text DEFAULT 'admin'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF FOUND THEN
    v_invoice_id := public._resolve_chat_submission_invoice(sub);
    UPDATE public.public_chat_payment_submissions SET status = 'rejected', notes = COALESCE(p_reason, notes) WHERE id = p_id;
    IF v_invoice_id IS NOT NULL THEN
      UPDATE public.payments
         SET is_verified = false, verification_status = 'rejected',
             notes = COALESCE(notes, '') || format(E'\nRejected by %s: %s', p_reviewed_by, COALESCE(p_reason, 'no reason given')),
             updated_at = now(), updated_by = p_reviewed_by
       WHERE invoice_id = v_invoice_id;
      UPDATE public.invoices SET status = 'unpaid', amount_paid = 0, balance_due = total_amount, updated_at = now(), updated_by = p_reviewed_by
       WHERE id = v_invoice_id;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM public.invoices WHERE id = p_id) THEN
    v_invoice_id := p_id;  -- invoice-backed row: reject only unverified payments, keep verified ones
    UPDATE public.payments
       SET is_verified = false, verification_status = 'rejected',
           notes = COALESCE(notes, '') || format(E'\nRejected by %s: %s', p_reviewed_by, COALESCE(p_reason, 'no reason given')),
           updated_at = now(), updated_by = p_reviewed_by
     WHERE invoice_id = v_invoice_id AND coalesce(verification_status,'pending') NOT IN ('verified','rejected');
    PERFORM public.recalc_invoice_from_payments(v_invoice_id);
  ELSE
    RAISE EXCEPTION 'School fees submission % not found', p_id;
  END IF;

  IF v_invoice_id IS NOT NULL THEN
    PERFORM public.release_credit_hold(v_invoice_id, p_reviewed_by);
    UPDATE public.lesson_bookings SET status = 'rejected', updated_at = now()
     WHERE invoice_id = v_invoice_id AND status = 'requested';
  END IF;
END;
$function$;