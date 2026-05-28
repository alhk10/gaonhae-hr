CREATE OR REPLACE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, registration_id uuid, slot_id uuid, branch_id text, branch_name text, branch_country text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text, result text, student_id uuid, certificate_name text, first_name text, last_name text, student_current_belt text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    'registration'::text,
    NULL::uuid,
    gr.id,
    gs.id,
    gs.branch_id,
    b.name,
    b.country,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title,
    COALESCE(
      NULLIF(btrim(gr.display_name), ''),
      NULLIF(btrim(s.display_name), ''),
      upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')))
    )::text,
    gr.current_belt,
    gr.target_belt,
    CASE
      WHEN i.status IN ('paid','verified') THEN 'paid'
      ELSE 'pending verification'
    END,
    NULL::numeric,
    NULL::text,
    gr.result,
    s.id,
    COALESCE(
      NULLIF(btrim(s.certificate_name), ''),
      NULLIF(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), '')
    )::text,
    s.first_name,
    s.last_name,
    s.current_belt
  FROM public.grading_registrations gr
  JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  LEFT JOIN public.branches b ON b.id = gs.branch_id
  JOIN public.students s ON s.id = gr.student_id
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  WHERE gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
    AND (p_to IS NULL OR gs.grading_date <= p_to)
    AND (p_branch_id IS NULL OR gs.branch_id = p_branch_id)

  UNION ALL

  SELECT
    'submission'::text,
    gps.id,
    NULL::uuid,
    gs.id,
    gps.branch_id,
    b.name,
    b.country,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title,
    COALESCE(
      NULLIF(btrim(gps.display_name), ''),
      upper(btrim(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,'')))
    )::text,
    gps.current_belt,
    NULL::text,
    CASE
      WHEN gps.status = 'verified' THEN 'paid'
      WHEN gps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    gps.amount,
    gps.proof_url,
    gps.result,
    gps.matched_student_id,
    NULL::text,
    gps.first_name,
    gps.last_name,
    s2.current_belt
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  LEFT JOIN public.students s2 ON s2.id = gps.matched_student_id
  WHERE gps.status <> 'rejected'
    AND gps.matched_invoice_id IS NULL
    AND (gs.grading_date IS NULL
         OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
             AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)

  ORDER BY 8 NULLS LAST, 9 NULLS LAST, 6 NULLS LAST, 13;
$function$