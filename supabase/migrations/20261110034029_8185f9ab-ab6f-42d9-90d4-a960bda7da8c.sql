CREATE OR REPLACE FUNCTION public.access_progress_report(p_password text, p_branch_id text, p_term_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  RETURN coalesce((
    SELECT jsonb_agg(x ORDER BY x->>'name') FROM (
      SELECT jsonb_build_object(
        'name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))),
        'dob', s.date_of_birth, 'has_card', c.id IS NOT NULL,
        'term_label', c.term_label, 'report_date', c.report_date, 'belt', coalesce(c.belt_snapshot, s.current_belt), 'age', c.age_snapshot,
        'ratings', coalesce(c.ratings,'{}'::jsonb), 'grading_readiness', c.grading_readiness, 'comments', NULL,
        'paid_date', (SELECT max(coalesce(p.verified_at::date, p.payment_date))
           FROM grading_registrations gr JOIN invoice_items ii ON ii.id = gr.invoice_item_id
           JOIN invoices i ON i.id = ii.invoice_id AND lower(coalesce(i.status,'')) IN ('paid','verified')
           JOIN payments p ON p.invoice_id = i.id AND coalesce(p.verification_status,'') <> 'rejected'
           WHERE gr.student_id = s.id AND gr.term_id = ANY(p_term_ids))
      ) x
      FROM students s
      LEFT JOIN LATERAL (SELECT * FROM student_progress_cards pc WHERE pc.student_id = s.id AND pc.term_calendar_id = ANY(p_term_ids) ORDER BY pc.report_date DESC LIMIT 1) c ON true
      WHERE s.branch_id = p_branch_id AND lower(coalesce(s.status,'')) = 'active' AND NOT coalesce(s.is_employee, false)
    ) q), '[]'::jsonb);
END $function$;