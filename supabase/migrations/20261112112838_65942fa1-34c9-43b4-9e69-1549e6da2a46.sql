CREATE OR REPLACE FUNCTION public._term_coverage(p_student_id uuid, p_term_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t record; v_first date; v_from date; v_req int; v_paid int; v_until date; v_late boolean;
BEGIN
  SELECT start_date, end_date, COALESCE(total_weeks, GREATEST(1, CEIL((end_date - start_date + 1)::numeric / 7)::int)) tw
    INTO t FROM term_calendars WHERE id = p_term_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT MIN(i.issue_date) INTO v_first FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON p.id = ii.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE i.student_id = p_student_id AND pc.name = 'Classes' AND COALESCE(p.is_adhoc_lesson,false) = false
      AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
      AND i.status IN ('paid','verified');
  v_from := GREATEST(t.start_date, LEAST(COALESCE(v_first, t.start_date), t.end_date));
  v_late := v_first IS NOT NULL AND v_first > t.start_date;
  v_req := GREATEST(1, LEAST(t.tw, CEIL((t.end_date - v_from + 1)::numeric / 7)::int));
  v_paid := public._term_paid_weeks(p_student_id, p_term_id);
  v_until := CASE WHEN v_paid <= 0 THEN NULL
                  WHEN v_paid >= v_req THEN t.end_date
                  ELSE LEAST(t.end_date, v_from + v_paid * 7 - 1) END;
  RETURN jsonb_build_object(
    'paid_weeks', v_paid, 'required_weeks', v_req, 'term_weeks', t.tw,
    'covered_from', v_from, 'covered_until', v_until,
    'remaining_weeks', GREATEST(0, v_req - v_paid),
    'fully_paid', v_paid >= v_req,
    'is_late_joiner', v_late,
    'grading_eligible', (v_late AND v_paid > 0) OR v_paid >= CEIL(t.tw * 0.5));
END $$;

CREATE OR REPLACE FUNCTION public._term_payment_status(p_student_id uuid, p_term_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c jsonb; v_any boolean;
BEGIN
  IF p_term_id IS NULL THEN RETURN NULL; END IF;
  IF (SELECT is_employee FROM students WHERE id = p_student_id) THEN RETURN 'paid'; END IF;
  SELECT count(*) > 0 INTO v_any FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON p.id = ii.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE i.student_id = p_student_id AND pc.name = 'Classes'
      AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
      AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void');
  IF NOT v_any THEN RETURN 'none'; END IF;
  c := public._term_coverage(p_student_id, p_term_id);
  IF (c->>'fully_paid')::boolean AND (c->>'paid_weeks')::int > 0 THEN RETURN 'paid'; END IF;
  IF (c->>'covered_until') IS NOT NULL AND CURRENT_DATE <= (c->>'covered_until')::date THEN RETURN 'paid'; END IF;
  RETURN 'unpaid';
END $function$;

DROP FUNCTION IF EXISTS public.get_public_chat_terms_for_student(uuid, uuid, text);
CREATE FUNCTION public.get_public_chat_terms_for_student(p_session_id uuid, p_student_id uuid, p_branch_id text)
 RETURNS TABLE(term_id uuid, term_name text, start_date date, end_date date, total_weeks integer, is_paid boolean,
               paid_weeks integer, remaining_weeks integer, covered_until date)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT t.id, t.name, t.start_date, t.end_date, (c->>'term_weeks')::int,
    ((c->>'paid_weeks')::int > 0 AND (c->>'fully_paid')::boolean),
    (c->>'paid_weeks')::int,
    CASE WHEN (c->>'paid_weeks')::int > 0 THEN (c->>'remaining_weeks')::int ELSE (c->>'term_weeks')::int END,
    (c->>'covered_until')::date
  FROM public.term_calendars t
  CROSS JOIN LATERAL (SELECT public._term_coverage(p_student_id, t.id) c) x
  WHERE t.branch_id = p_branch_id AND COALESCE(t.is_active, true) = true AND t.end_date >= CURRENT_DATE
  ORDER BY t.start_date ASC LIMIT 6;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_chat_terms_for_student(uuid, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hello_grading_eligibility(p_session_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_branch text; v_term uuid; c jsonb;
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  PERFORM public._validate_public_chat_session(p_session_id, p_student_id, v_branch);
  SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND current_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  IF v_term IS NULL THEN
    SELECT t.id INTO v_term FROM term_calendars t WHERE t.branch_id = v_branch AND t.start_date <= current_date ORDER BY t.start_date DESC LIMIT 1;
  END IF;
  c := public._term_coverage(p_student_id, v_term);
  RETURN public._grading_ready_state(p_student_id, v_term) || jsonb_build_object('term_id', v_term,
    'term_eligible', COALESCE((SELECT is_employee FROM students WHERE id = p_student_id), false) OR COALESCE((c->>'grading_eligible')::boolean, false),
    'paid_weeks', COALESCE((c->>'paid_weeks')::int, 0), 'term_weeks', (c->>'term_weeks')::int);
END $$;

CREATE OR REPLACE FUNCTION public.get_access_student_payment_summary(p_branch_id text DEFAULT NULL)
RETURNS TABLE(branch_id text, branch_name text, current_count integer, paid_count integer, unpaid_count integer, no_invoice_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id
    FROM term_calendars t WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ), st AS (
    SELECT s.branch_id, public._term_payment_status(s.id, ct.id) ps
    FROM students s LEFT JOIN current_terms ct ON ct.branch_id = s.branch_id
    WHERE lower(coalesce(s.status,'')) IN ('active','trial') AND NOT s.is_employee
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
  )
  SELECT st.branch_id, b.name, count(*)::int,
    count(*) FILTER (WHERE ps = 'paid')::int,
    count(*) FILTER (WHERE ps = 'unpaid')::int,
    count(*) FILTER (WHERE ps IS NULL OR ps = 'none')::int
  FROM st LEFT JOIN branches b ON b.id = st.branch_id
  GROUP BY st.branch_id, b.name ORDER BY b.name;
$$;

CREATE OR REPLACE FUNCTION public.term_payment_statuses(p_branch_id text, p_term_id uuid)
RETURNS TABLE(student_id uuid, status text, fully_paid boolean, grading_eligible boolean, paid_weeks integer, remaining_weeks integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.id,
    CASE WHEN ps = 'paid' THEN 'paid' WHEN (c->>'paid_weeks')::int > 0 THEN 'partial' ELSE ps END,
    COALESCE((c->>'fully_paid')::boolean AND (c->>'paid_weeks')::int > 0, false),
    s.is_employee OR COALESCE((c->>'grading_eligible')::boolean, false),
    COALESCE((c->>'paid_weeks')::int, 0), (c->>'remaining_weeks')::int
  FROM students s
  CROSS JOIN LATERAL (SELECT public._term_coverage(s.id, p_term_id) c, public._term_payment_status(s.id, p_term_id) ps) x
  WHERE auth.uid() IS NOT NULL AND s.branch_id = p_branch_id;
$$;

CREATE OR REPLACE FUNCTION public.student_term_coverage(p_student_id uuid)
RETURNS TABLE(term_id uuid, fully_paid boolean, grading_eligible boolean, paid_weeks integer, remaining_weeks integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id, COALESCE((c->>'fully_paid')::boolean AND (c->>'paid_weeks')::int > 0, false),
    COALESCE((c->>'grading_eligible')::boolean, false),
    COALESCE((c->>'paid_weeks')::int, 0), (c->>'remaining_weeks')::int
  FROM students s JOIN term_calendars t ON t.branch_id = s.branch_id
  CROSS JOIN LATERAL (SELECT public._term_coverage(s.id, t.id) c) x
  WHERE auth.uid() IS NOT NULL AND s.id = p_student_id;
$$;

REVOKE EXECUTE ON FUNCTION public._term_coverage(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._term_payment_status(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.term_payment_statuses(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.student_term_coverage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.term_payment_statuses(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_term_coverage(uuid) TO authenticated;