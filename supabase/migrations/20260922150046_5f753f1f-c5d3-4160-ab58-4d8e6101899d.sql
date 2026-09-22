CREATE OR REPLACE FUNCTION public.get_public_student_profile(p_student_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id, t.name
    FROM term_calendars t
    WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  enrol AS (
    SELECT DISTINCT ON (e.student_id)
      e.student_id, e.class_type, e.tier_name, e.enrolled_weekdays, ct.name AS term_name
    FROM student_class_enrollments e
    JOIN current_terms ct ON ct.id = e.term_id
    WHERE lower(coalesce(e.status,'')) IN ('active')
      AND e.student_id = p_student_id
    ORDER BY e.student_id, e.created_at DESC
  ),
  cred AS (
    SELECT COALESCE(SUM(c.amount),0) AS balance
    FROM student_credits c
    WHERE c.student_id = p_student_id
  ),
  inv AS (
    SELECT
      i.id, i.invoice_number, i.issue_date, i.due_date, i.status,
      i.subtotal, i.tax_amount, i.total_amount, i.amount_paid, i.balance_due,
      b.name AS branch_name,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ii.id,
          'description', ii.description,
          'quantity', ii.quantity,
          'unit_price', ii.unit_price,
          'total_amount', ii.total_amount
        ) ORDER BY ii.created_at)
        FROM invoice_items ii WHERE ii.invoice_id = i.id
      ), '[]'::jsonb) AS items,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', p.id,
          'payment_number', p.payment_number,
          'payment_date', p.payment_date,
          'amount', p.amount,
          'payment_method', p.payment_method,
          'verification_status', p.verification_status
        ) ORDER BY p.payment_date DESC NULLS LAST, p.created_at DESC)
        FROM payments p WHERE p.invoice_id = i.id
      ), '[]'::jsonb) AS payments
    FROM invoices i
    LEFT JOIN branches b ON b.id = i.branch_id
    WHERE i.student_id = p_student_id
    ORDER BY i.issue_date DESC NULLS LAST, i.created_at DESC
    LIMIT 100
  )
  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id,
      'student_number', s.student_number,
      'name', UPPER(coalesce(NULLIF(btrim(s.display_name),''), NULLIF(concat_ws(' ', s.first_name, s.last_name),''),'')),
      'first_name', s.first_name,
      'last_name', s.last_name,
      'certificate_name', s.certificate_name,
      'current_belt', s.current_belt,
      'status', lower(s.status),
      'gender', s.gender,
      'date_of_birth', s.date_of_birth,
      'branch_id', s.branch_id,
      'branch_name', b.name,
      'email', s.email,
      'phone', s.phone,
      'alt_emails', COALESCE(s.alt_emails, '{}'),
      'alt_phones', COALESCE(s.alt_phones, '{}'),
      'credit_balance', (SELECT balance FROM cred)
    ),
    'enrolment', (
      SELECT jsonb_build_object(
        'term_name', e.term_name,
        'class_type', e.class_type,
        'tier_name', e.tier_name,
        'enrolled_weekdays', e.enrolled_weekdays
      ) FROM enrol e
    ),
    'invoices', COALESCE((SELECT jsonb_agg(to_jsonb(inv)) FROM inv), '[]'::jsonb)
  )
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  WHERE s.id = p_student_id;
$function$;

REVOKE ALL ON FUNCTION public.get_public_student_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_student_profile(uuid) TO anon, authenticated;