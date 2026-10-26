ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_employee boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.access_set_student_employee(p_password text, p_student_id uuid, p_value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public._access_scope(p_password) <> '*' THEN
    RAISE EXCEPTION 'Only the all-branch password can tag employees';
  END IF;
  UPDATE students SET is_employee = coalesce(p_value,false), updated_at = now() WHERE id = p_student_id;
END $$;
GRANT EXECUTE ON FUNCTION public.access_set_student_employee(text, uuid, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._term_payment_status(p_student_id uuid, p_term_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_term_id IS NULL THEN NULL
    WHEN (SELECT is_employee FROM students WHERE id = p_student_id) THEN 'paid'
    WHEN bool_or(i.status IN ('paid','verified')) THEN 'paid'
    WHEN count(i.id) > 0 THEN 'unpaid'
    ELSE 'none' END
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
    AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void');
$function$;

CREATE OR REPLACE FUNCTION public.get_access_student_payment_summary(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(branch_id text, branch_name text, current_count integer, paid_count integer, unpaid_count integer, no_invoice_count integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id
    FROM term_calendars t WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  inv AS (
    SELECT DISTINCT ON (i.student_id) i.student_id, lower(coalesce(i.status,'')) AS status
    FROM invoices i
    JOIN current_terms ct ON ct.branch_id = i.branch_id
    WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled')
      AND i.issue_date <= now()::date
      AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
        AND (ii.metadata->>'term_id' = ct.id::text
          OR (ii.metadata ? 'term_ids' AND ii.metadata->'term_ids' ? ct.id::text)))
    ORDER BY i.student_id, i.issue_date DESC NULLS LAST, i.created_at DESC
  )
  SELECT s.branch_id, b.name,
    count(*)::int,
    count(*) FILTER (WHERE i.status IN ('paid','verified','paid_verified','pending_verification'))::int,
    count(*) FILTER (WHERE i.status IS NOT NULL AND i.status NOT IN ('paid','verified','paid_verified','pending_verification'))::int,
    count(*) FILTER (WHERE i.status IS NULL)::int
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  LEFT JOIN inv i ON i.student_id = s.id
  WHERE lower(coalesce(s.status,'')) IN ('active','trial')
    AND NOT s.is_employee
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
  GROUP BY s.branch_id, b.name
  ORDER BY b.name;
$function$;

DROP FUNCTION IF EXISTS public.get_public_student_directory(text, text, text);
CREATE FUNCTION public.get_public_student_directory(p_search text DEFAULT NULL::text, p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, student_number text, name text, first_name text, last_name text, current_belt text, branch_id text, branch_name text, status text, email text, phone text, date_of_birth date, term_name text, class_type text, tier_name text, enrolled_weekdays text[], invoice_status text, invoice_total numeric, invoice_balance numeric, credit_balance numeric, is_employee boolean, class_group text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id, t.name
    FROM term_calendars t WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  enrol AS (
    SELECT lb.student_id,
      (array_agg(lb.class_type ORDER BY lb.lesson_date DESC))[1] AS class_type,
      NULL::text AS tier_name,
      array_agg(DISTINCT trim(to_char(lb.lesson_date,'Day')))::text[] AS enrolled_weekdays,
      ct.name AS term_name
    FROM lesson_bookings lb
    JOIN current_terms ct ON ct.id = lb.term_id
    WHERE lb.status IN ('booked','attended','absent')
    GROUP BY lb.student_id, ct.name
  ),
  grp AS (
    SELECT lb.student_id,
      CASE
        WHEN bool_or(lb.class_type ILIKE 'Team Gaonhae%') THEN 'Team Gaonhae'
        ELSE (array_agg(
          CASE WHEN lb.class_type ILIKE 'Little Gaonhae%' THEN 'Little Gaonhae'
               WHEN lb.class_type ILIKE 'Kids%' THEN 'Kids'
               WHEN lb.class_type ILIKE 'Teens%' THEN 'Teens & Adults' END
          ORDER BY lb.lesson_date DESC) FILTER (WHERE lb.class_type ILIKE ANY (ARRAY['Little Gaonhae%','Kids%','Teens%'])))[1]
      END AS class_group
    FROM lesson_bookings lb
    WHERE lb.status = 'attended' AND lb.lesson_date >= current_date - 90
    GROUP BY lb.student_id
  ),
  inv AS (
    SELECT DISTINCT ON (i.student_id) i.student_id, i.status, i.total_amount, i.balance_due
    FROM invoices i
    JOIN current_terms ct ON ct.branch_id = i.branch_id
    WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled')
      AND i.issue_date <= now()::date
      AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
          AND (ii.metadata->>'term_id' = ct.id::text
            OR (ii.metadata ? 'term_ids' AND ii.metadata->'term_ids' ? ct.id::text)))
    ORDER BY i.student_id, i.issue_date DESC NULLS LAST, i.created_at DESC
  ),
  credits AS (
    SELECT c.student_id, COALESCE(SUM(c.amount),0) AS balance FROM student_credits c GROUP BY c.student_id
  )
  SELECT s.id, s.student_number,
    UPPER(coalesce(NULLIF(btrim(s.display_name),''), NULLIF(concat_ws(' ', s.first_name, s.last_name),''),''))::text,
    s.first_name, s.last_name, s.current_belt, s.branch_id, b.name, lower(s.status), s.email, s.phone, s.date_of_birth,
    e.term_name, e.class_type, e.tier_name, e.enrolled_weekdays,
    i.status, i.total_amount, i.balance_due, COALESCE(cr.balance, 0),
    s.is_employee, g.class_group
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  LEFT JOIN enrol e ON e.student_id = s.id
  LEFT JOIN grp g ON g.student_id = s.id
  LEFT JOIN inv i ON i.student_id = s.id
  LEFT JOIN credits cr ON cr.student_id = s.id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR lower(s.status) = lower(p_status))
    AND (p_search IS NULL OR btrim(p_search) = '' OR
      concat_ws(' ', s.first_name, s.last_name) ILIKE '%' || btrim(p_search) || '%' OR
      concat_ws(' ', s.last_name, s.first_name) ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.display_name,'') ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.email,'') ILIKE '%' || btrim(p_search) || '%')
  ORDER BY s.is_employee, lower(s.status) = 'active' DESC, s.first_name, s.last_name
  LIMIT 200;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_student_directory(text, text, text) TO anon, authenticated;