DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_public_student_directory'::regproc);
  d := replace(d, '    i.status, i.total_amount, i.balance_due, COALESCE(cr.balance, 0),',
    '    CASE WHEN i.status IS NOT NULL AND lower(i.status) IN (''paid'',''verified'',''paid_verified'',''pending_verification'')
              AND public._term_payment_status(s.id, coalesce(e.term_id, bt.id)) = ''unpaid'' THEN ''partially_paid'' ELSE i.status END,
    i.total_amount, i.balance_due, COALESCE(cr.balance, 0),');
  IF position('_term_payment_status' in d) = 0 THEN RAISE EXCEPTION 'patch target not found'; END IF;
  EXECUTE d;
END $$;