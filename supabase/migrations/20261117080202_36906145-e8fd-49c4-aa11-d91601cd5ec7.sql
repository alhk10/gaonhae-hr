CREATE OR REPLACE FUNCTION public._term_coverage(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  v_late := v_first IS NOT NULL AND v_first > t.start_date
    AND EXISTS (SELECT 1 FROM students s WHERE s.id = p_student_id AND s.created_at::date > t.start_date)
    AND NOT EXISTS (SELECT 1 FROM invoices i2 JOIN invoice_items ii2 ON ii2.invoice_id = i2.id
        JOIN products p2 ON p2.id = ii2.product_id JOIN product_categories pc2 ON pc2.id = p2.category_id
        WHERE i2.student_id = p_student_id AND pc2.name = 'Classes'
          AND i2.status IN ('paid','verified') AND i2.issue_date < t.start_date);
  v_from := CASE WHEN v_late THEN LEAST(v_first, t.end_date) ELSE t.start_date END;
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
END $function$;