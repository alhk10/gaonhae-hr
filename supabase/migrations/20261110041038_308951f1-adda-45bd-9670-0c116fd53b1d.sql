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
        'paid_date', pay.paid_date, 'paid_amount', pay.paid_amount,
        'attendance', (SELECT jsonb_build_object(
             'attended', count(*) FILTER (WHERE lb.status='attended'),
             'absent', count(*) FILTER (WHERE lb.status='absent'),
             'booked', count(*) FILTER (WHERE lb.status='booked'),
             'total', count(*) FILTER (WHERE lb.status IN ('attended','absent','booked')),
             'marks', coalesce(jsonb_object_agg(lb.lesson_date::text, lb.status) FILTER (WHERE lb.status IN ('attended','absent')), '{}'::jsonb))
           FROM lesson_bookings lb
           WHERE lb.student_id = s.id AND (lb.term_id = ANY(p_term_ids)
             OR EXISTS (SELECT 1 FROM term_calendars t WHERE t.id = ANY(p_term_ids) AND lb.lesson_date BETWEEN t.start_date AND t.end_date)))
      ) x
      FROM students s
      LEFT JOIN LATERAL (SELECT * FROM student_progress_cards pc WHERE pc.student_id = s.id AND pc.term_calendar_id = ANY(p_term_ids) ORDER BY pc.report_date DESC LIMIT 1) c ON true
      LEFT JOIN LATERAL (
        SELECT max(coalesce(p.verified_at::date, p.payment_date)) AS paid_date, sum(p.amount) AS paid_amount
        FROM payments p WHERE p.id IN (
          SELECT DISTINCT p2.id
          FROM grading_registrations gr
          JOIN grading_slots gs ON gs.id = gr.grading_slot_id
          JOIN term_calendars tc ON tc.id = ANY(p_term_ids)
            AND ((gs.grading_year IS NOT NULL AND gs.grading_term IS NOT NULL AND gs.grading_year = tc.year AND gs.grading_term = tc.term_number)
              OR ((gs.grading_year IS NULL OR gs.grading_term IS NULL) AND gs.grading_date BETWEEN tc.start_date AND tc.end_date))
          JOIN invoice_items ii ON ii.id = gr.invoice_item_id
          JOIN invoices i ON i.id = ii.invoice_id AND lower(coalesce(i.status,'')) IN ('paid','verified')
          JOIN payments p2 ON p2.invoice_id = i.id AND lower(coalesce(p2.verification_status,'')) = 'verified'
          WHERE gr.student_id = s.id)
      ) pay ON true
      WHERE s.branch_id = p_branch_id AND lower(coalesce(s.status,'')) = 'active' AND NOT coalesce(s.is_employee, false)
    ) q), '[]'::jsonb);
END $function$;