
-- Extend get_public_grading_list with submission id, amount, proof_url
DROP FUNCTION IF EXISTS public.get_public_grading_list(text, date, date);

CREATE OR REPLACE FUNCTION public.get_public_grading_list(
  p_branch_id text DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(
  source text,
  submission_id uuid,
  slot_id uuid,
  branch_id text,
  branch_name text,
  grading_date date,
  start_time time without time zone,
  end_time time without time zone,
  location text,
  student_name text,
  current_belt text,
  target_belt text,
  paid_status text,
  amount numeric,
  proof_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    'registration'::text,
    NULL::uuid,
    gs.id,
    gs.branch_id,
    b.name,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))::text,
    gr.current_belt,
    gr.target_belt,
    CASE
      WHEN i.status IN ('paid','verified') THEN 'paid'
      ELSE 'pending verification'
    END,
    NULL::numeric,
    NULL::text
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
    gs.id,
    gps.branch_id,
    b.name,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    upper(gps.student_name)::text,
    gps.current_belt,
    NULL::text,
    CASE
      WHEN gps.status = 'verified' THEN 'paid'
      WHEN gps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    gps.amount,
    gps.proof_url
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  WHERE gps.matched_student_id IS NULL
    AND gps.status <> 'rejected'
    AND (gs.grading_date IS NULL
         OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
             AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)

  ORDER BY 6 NULLS LAST, 7 NULLS LAST, 5 NULLS LAST, 10;
$function$;

-- Admin: update the slot for a submission
CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_slot(
  p_id uuid,
  p_slot_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.grading_payment_submissions
  SET resolved_grading_slot_id = p_slot_id,
      updated_at = now()
  WHERE id = p_id;
$function$;

-- Admin: delete a submission
CREATE OR REPLACE FUNCTION public.admin_delete_grading_submission(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.grading_payment_submissions WHERE id = p_id;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_slot(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_grading_submission(uuid) TO anon, authenticated;
