-- Helper: resolve the invoice created by submit_public_chat_invoice for a chat submission
CREATE OR REPLACE FUNCTION public._resolve_chat_submission_invoice(p_sub public.public_chat_payment_submissions)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    p_sub.matched_invoice_id,
    (
      SELECT i.id
      FROM public.invoices i
      WHERE i.student_id = p_sub.matched_student_id
        AND i.created_by = 'public_hello_chat'
        AND i.internal_notes LIKE '%session=' || p_sub.session_id::text || '%'
      ORDER BY i.created_at DESC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_school_fees_list(
  p_branch_id text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  student_id uuid,
  student_name text,
  branch_id text,
  branch_name text,
  category text,
  items jsonb,
  amount numeric,
  payment_method text,
  proof_url text,
  status text,
  invoice_id uuid,
  invoice_number text,
  invoice_status text,
  payment_id uuid,
  payment_number text,
  payment_verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    s.created_at,
    s.matched_student_id AS student_id,
    UPPER(TRIM(COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))) AS student_name,
    s.branch_id,
    b.name AS branch_name,
    s.category,
    s.items,
    s.amount,
    s.payment_method,
    s.proof_url,
    s.status,
    inv.id AS invoice_id,
    inv.invoice_number,
    inv.status AS invoice_status,
    pay.id AS payment_id,
    pay.payment_number,
    pay.verification_status AS payment_verification_status
  FROM public.public_chat_payment_submissions s
  LEFT JOIN public.students st ON st.id = s.matched_student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN LATERAL (
    SELECT i.* FROM public.invoices i
    WHERE i.id = public._resolve_chat_submission_invoice(s)
  ) inv ON true
  LEFT JOIN LATERAL (
    SELECT p.* FROM public.payments p
    WHERE p.invoice_id = inv.id
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pay ON true
  WHERE s.category = 'a416f120-4ec2-4826-8d37-375db3e002bc'
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR s.status = p_status)
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_school_fees_submission(p_id uuid, p_verified_by text DEFAULT 'admin')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  UPDATE public.public_chat_payment_submissions
     SET status = 'verified',
         notes = COALESCE(notes, '') || format(E'\nVerified by %s at %s', p_verified_by, now())
   WHERE id = p_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.payments
       SET is_verified = true,
           verification_status = 'verified',
           verified_at = now(),
           updated_at = now(),
           updated_by = p_verified_by
     WHERE invoice_id = v_invoice_id;

    UPDATE public.invoices
       SET status = 'verified',
           updated_at = now(),
           updated_by = p_verified_by
     WHERE id = v_invoice_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_school_fees_submission(p_id uuid, p_reason text DEFAULT NULL, p_reviewed_by text DEFAULT 'admin')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  UPDATE public.public_chat_payment_submissions
     SET status = 'rejected',
         notes = COALESCE(p_reason, notes)
   WHERE id = p_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.payments
       SET is_verified = false,
           verification_status = 'rejected',
           notes = COALESCE(notes, '') || format(E'\nRejected by %s: %s', p_reviewed_by, COALESCE(p_reason, 'no reason given')),
           updated_at = now(),
           updated_by = p_reviewed_by
     WHERE invoice_id = v_invoice_id;

    UPDATE public.invoices
       SET status = 'unpaid',
           amount_paid = 0,
           balance_due = total_amount,
           updated_at = now(),
           updated_by = p_reviewed_by
     WHERE id = v_invoice_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_school_fees_delete_context(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  SELECT jsonb_build_object(
    'submission_id', sub.id,
    'amount', sub.amount,
    'student_name', UPPER(TRIM(COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))),
    'invoice_id', v_invoice_id,
    'invoice_number', inv.invoice_number,
    'invoice_items', (SELECT count(*) FROM public.invoice_items ii WHERE ii.invoice_id = v_invoice_id),
    'payments', (SELECT count(*) FROM public.payments p WHERE p.invoice_id = v_invoice_id)
  )
  INTO v_result
  FROM (SELECT 1) x
  LEFT JOIN public.students st ON st.id = sub.matched_student_id
  LEFT JOIN public.invoices inv ON inv.id = v_invoice_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_school_fees_submission(p_id uuid, p_deleted_by text DEFAULT 'admin')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  DELETE FROM public.public_chat_payment_submissions WHERE id = p_id;

  IF v_invoice_id IS NOT NULL THEN
    DELETE FROM public.payments WHERE invoice_id = v_invoice_id;
    DELETE FROM public.invoice_items WHERE invoice_id = v_invoice_id;
    DELETE FROM public.invoices WHERE id = v_invoice_id AND created_by = 'public_hello_chat';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_fees_list(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_school_fees_submission(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_school_fees_submission(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_school_fees_delete_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school_fees_submission(uuid, text) TO anon, authenticated;