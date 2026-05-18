-- Add first_name/last_name to grading_payment_submissions
ALTER TABLE public.grading_payment_submissions
  ADD COLUMN first_name text,
  ADD COLUMN last_name text;

-- Backfill from existing student_name
UPDATE public.grading_payment_submissions
SET
  first_name = upper(coalesce(split_part(btrim(student_name), ' ', 1), '')),
  last_name = upper(coalesce(NULLIF(btrim(substring(btrim(student_name) from (position(' ' in btrim(student_name)) + 1))), ''), ''))
WHERE first_name IS NULL;

-- Ensure no nulls remain before NOT NULL
UPDATE public.grading_payment_submissions SET first_name = '' WHERE first_name IS NULL;
UPDATE public.grading_payment_submissions SET last_name = '' WHERE last_name IS NULL;

ALTER TABLE public.grading_payment_submissions
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Drop legacy student_name column
ALTER TABLE public.grading_payment_submissions DROP COLUMN student_name;

-- Recreate get_public_grading_list with composed student_name
DROP FUNCTION IF EXISTS public.get_public_grading_list(text, date, date);

CREATE OR REPLACE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, slot_id uuid, branch_id text, branch_name text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text)
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
    gs.title,
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
    gs.title,
    upper(btrim(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,'')))::text,
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

  ORDER BY 6 NULLS LAST, 7 NULLS LAST, 5 NULLS LAST, 11;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_list(text, date, date) TO anon, authenticated;

-- Update find_grading_submission_student_matches to use composed name
CREATE OR REPLACE FUNCTION public.find_grading_submission_student_matches(p_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_number text,
  full_name text,
  email text,
  date_of_birth date,
  branch_id text,
  current_belt text,
  score numeric,
  reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
  sub_name text;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (lower(coalesce(s.email,'')) = lower(coalesce(sub.email,'')) AND sub.email IS NOT NULL) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name '||round(sc.name_sim*100)::text||'%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$$;