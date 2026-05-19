
-- Add display_name + result to submissions for editable parity with registrations
ALTER TABLE public.grading_payment_submissions
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS result text;

-- Update get_public_grading_list to expose display_name / result for submissions
DROP FUNCTION IF EXISTS public.get_public_grading_list(text, date, date);

CREATE FUNCTION public.get_public_grading_list(
  p_branch_id text DEFAULT NULL::text,
  p_from date DEFAULT NULL::date,
  p_to date DEFAULT NULL::date
)
 RETURNS TABLE(
   source text, submission_id uuid, registration_id uuid, slot_id uuid,
   branch_id text, branch_name text, grading_date date,
   start_time time without time zone, end_time time without time zone,
   location text, slot_title text, student_name text,
   current_belt text, target_belt text, paid_status text,
   amount numeric, proof_url text, result text,
   student_id uuid, certificate_name text,
   first_name text, last_name text
 )
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
    s.last_name
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
    gps.last_name
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  WHERE gps.status <> 'rejected'
    AND (gs.grading_date IS NULL
         OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
             AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)

  ORDER BY 7 NULLS LAST, 8 NULLS LAST, 6 NULLS LAST, 12;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_list(text, date, date) TO anon, authenticated;

-- Submission admin RPCs (mirror registration ones)
CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_branch(
  p_submission_id uuid,
  p_branch_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_slot uuid;
  v_current_date date;
  v_new_slot uuid;
BEGIN
  SELECT gps.resolved_grading_slot_id, gs.grading_date
    INTO v_current_slot, v_current_date
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  WHERE gps.id = p_submission_id;

  IF v_current_date IS NOT NULL AND p_branch_id IS NOT NULL THEN
    SELECT id INTO v_new_slot
    FROM public.grading_slots
    WHERE branch_id = p_branch_id AND grading_date = v_current_date
    ORDER BY start_time NULLS LAST
    LIMIT 1;
  END IF;

  UPDATE public.grading_payment_submissions
  SET branch_id = p_branch_id,
      resolved_grading_slot_id = COALESCE(v_new_slot, resolved_grading_slot_id),
      updated_at = now()
  WHERE id = p_submission_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_branch(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_display_name(
  p_submission_id uuid,
  p_display_name text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.grading_payment_submissions
  SET display_name = NULLIF(btrim(p_display_name), ''),
      updated_at = now()
  WHERE id = p_submission_id;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_display_name(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_result(
  p_submission_id uuid,
  p_result text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.grading_payment_submissions
  SET result = NULLIF(btrim(p_result), ''),
      updated_at = now()
  WHERE id = p_submission_id;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_result(uuid, text) TO anon, authenticated;
