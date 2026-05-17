DROP FUNCTION IF EXISTS public.get_public_grading_slots(text, uuid[], date);

CREATE OR REPLACE FUNCTION public.get_public_grading_slots(p_branch_id text, p_product_ids uuid[], p_dob date DEFAULT NULL)
 RETURNS TABLE(id uuid, branch_id text, branch_name text, branch_address text, grading_date date, start_time time without time zone, end_time time without time zone, location text, title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    gs.id,
    gs.branch_id,
    b.name AS branch_name,
    b.address AS branch_address,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title
  FROM public.grading_slots gs
  JOIN public.branches b ON b.id = gs.branch_id
  WHERE gs.grading_date >= CURRENT_DATE
    AND COALESCE(gs.status, 'active') <> 'cancelled'
    AND (
      gs.branch_id = p_branch_id
      OR (gs.available_branch_ids IS NOT NULL AND p_branch_id = ANY(gs.available_branch_ids))
    )
    AND (
      p_product_ids IS NULL
      OR array_length(p_product_ids, 1) IS NULL
      OR gs.grading_product_ids IS NULL
      OR array_length(gs.grading_product_ids, 1) IS NULL
      OR gs.grading_product_ids && p_product_ids
    )
    AND (
      p_dob IS NULL
      OR (
        (gs.min_age IS NULL OR date_part('year', age(gs.grading_date, p_dob)) >= gs.min_age)
        AND
        (gs.max_age IS NULL OR date_part('year', age(gs.grading_date, p_dob)) <= gs.max_age)
      )
    )
  ORDER BY gs.grading_date ASC, gs.start_time ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_slots(text, uuid[], date) TO anon, authenticated;