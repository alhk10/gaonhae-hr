CREATE OR REPLACE FUNCTION public._term_paid_weeks(p_student_id uuid, p_term_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(CASE WHEN ii.metadata->>'payment_plan' = 'four_weeks'
      THEN COALESCE(NULLIF(ii.metadata->>'weeks','')::int, 4)
      ELSE 1000 END), 0)::int
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND COALESCE(p.is_adhoc_lesson,false) = false
    AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
    AND i.status IN ('paid','verified');
$$;

CREATE OR REPLACE FUNCTION public._term_payment_status(p_student_id uuid, p_term_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN p_term_id IS NULL THEN NULL
    WHEN (SELECT is_employee FROM students WHERE id = p_student_id) THEN 'paid'
    WHEN bool_or(i.status IN ('paid','verified')) THEN
      CASE WHEN public._term_paid_weeks(p_student_id, p_term_id) >=
        COALESCE((SELECT total_weeks FROM term_calendars WHERE id = p_term_id), 1)
      THEN 'paid' ELSE 'unpaid' END
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

CREATE OR REPLACE FUNCTION public.get_public_chat_terms_for_student(p_session_id uuid, p_student_id uuid, p_branch_id text)
 RETURNS TABLE(term_id uuid, term_name text, start_date date, end_date date, total_weeks integer, is_paid boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT t.id, t.name, t.start_date, t.end_date, w.tw,
    public._term_paid_weeks(p_student_id, t.id) >= w.tw
  FROM public.term_calendars t
  CROSS JOIN LATERAL (SELECT COALESCE(t.total_weeks, GREATEST(1, CEIL((t.end_date - t.start_date + 1)::numeric / 7)::integer)) AS tw) w
  WHERE t.branch_id = p_branch_id AND COALESCE(t.is_active, true) = true AND t.end_date >= CURRENT_DATE
  ORDER BY t.start_date ASC LIMIT 6;
END;
$function$;