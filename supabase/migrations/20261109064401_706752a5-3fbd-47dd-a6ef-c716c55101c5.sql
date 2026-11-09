CREATE OR REPLACE FUNCTION public.access_grading_term_status(p_slot_ids uuid[])
RETURNS TABLE(slot_id uuid, student_id uuid, term_id uuid, term_label text, term_status text, term_balance numeric, ready boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH raw AS (
    SELECT gr.grading_slot_id AS slot_id, gr.student_id, gr.term_id AS reg_term,
      COALESCE(gr.branch_id, s.branch_id, gs.branch_id)::text AS branch_id
    FROM grading_registrations gr
    JOIN grading_slots gs ON gs.id = gr.grading_slot_id
    JOIN students s ON s.id = gr.student_id
    WHERE gr.grading_slot_id = ANY(p_slot_ids)
    UNION
    SELECT sub.resolved_grading_slot_id, sub.matched_student_id, NULL::uuid,
      COALESCE(sub.branch_id::text, s.branch_id::text, gs.branch_id::text)
    FROM grading_payment_submissions sub
    JOIN grading_slots gs ON gs.id = sub.resolved_grading_slot_id
    JOIN students s ON s.id = sub.matched_student_id
    WHERE sub.resolved_grading_slot_id = ANY(p_slot_ids)
  ), pairs AS (
    SELECT DISTINCT ON (r.slot_id, r.student_id) r.*, gs.grading_year, gs.grading_term, gs.grading_date
    FROM raw r JOIN grading_slots gs ON gs.id = r.slot_id
    ORDER BY r.slot_id, r.student_id, r.reg_term NULLS LAST
  ), resolved AS (
    SELECT p.*, COALESCE(
      (SELECT t.id FROM term_calendars t WHERE p.grading_year IS NOT NULL AND p.grading_term IS NOT NULL
         AND t.year = p.grading_year AND t.term_number = p.grading_term
         ORDER BY (t.branch_id::text = p.branch_id) DESC NULLS LAST, (t.id = p.reg_term) DESC LIMIT 1),
      (SELECT t.id FROM term_calendars t WHERE p.grading_date BETWEEN t.start_date AND t.end_date
         ORDER BY (t.branch_id::text = p.branch_id) DESC NULLS LAST, (t.id = p.reg_term) DESC LIMIT 1),
      p.reg_term) AS tid
    FROM pairs p
  )
  SELECT r.slot_id, r.student_id, r.tid,
    CASE WHEN t.term_number IS NOT NULL THEN 'T' || t.term_number ELSE t.name END,
    _term_payment_status(r.student_id, r.tid),
    (SELECT coalesce(sum(DISTINCT i.balance_due),0) FROM invoices i JOIN invoice_items ii ON ii.invoice_id=i.id
       JOIN products pr ON pr.id=ii.product_id JOIN product_categories pc ON pc.id=pr.category_id
       WHERE i.student_id=r.student_id AND pc.name='Classes'
         AND coalesce(ii.metadata->>'term_id', pr.term_id::text)=r.tid::text
         AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void','paid','verified','refunded')),
    coalesce((_grading_ready_state(r.student_id, r.tid)->>'ready')::boolean, false)
  FROM resolved r LEFT JOIN term_calendars t ON t.id = r.tid;
$$;