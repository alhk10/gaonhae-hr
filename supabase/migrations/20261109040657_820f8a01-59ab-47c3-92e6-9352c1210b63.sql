CREATE OR REPLACE FUNCTION public._grading_ready_state(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH t AS (
    SELECT id, start_date, end_date,
      nullif(substring(name from '(\d{4})'),'')::int AS yr,
      nullif(substring(name from '[Tt]erm\s*(\d)'),'')::int AS tm
    FROM term_calendars WHERE id = p_term_id
  )
  SELECT jsonb_build_object(
    'ready', coalesce(bool_or(gr.ready_for_grading), false),
    'paid', coalesce(bool_or(EXISTS (SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
              WHERE ii.id = gr.invoice_item_id AND lower(coalesce(i.status,'')) IN ('paid','verified'))), false))
  FROM grading_registrations gr
  CROSS JOIN t
  LEFT JOIN grading_slots gs ON gs.id = gr.grading_slot_id
  WHERE gr.student_id = p_student_id AND gr.term_id = p_term_id
    AND (
      gs.id IS NULL
      OR (gs.grading_year IS NOT NULL AND gs.grading_term IS NOT NULL AND t.yr IS NOT NULL AND t.tm IS NOT NULL
          AND gs.grading_year = t.yr AND gs.grading_term = t.tm)
      OR ((gs.grading_year IS NULL OR gs.grading_term IS NULL OR t.yr IS NULL OR t.tm IS NULL)
          AND (t.start_date IS NULL OR gs.grading_date >= t.start_date)
          AND (t.end_date IS NULL OR gs.grading_date <= t.end_date))
    );
$function$;